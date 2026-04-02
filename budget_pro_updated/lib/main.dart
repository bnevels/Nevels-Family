import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BudgetApp());
}

class BudgetApp extends StatelessWidget {
  const BudgetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Budget Pro Premium',
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF7F8FC),
      ),
      home: const BudgetHome(),
    );
  }
}

class BillItem {
  BillItem({
    required this.id,
    required this.name,
    required this.amount,
    required this.dueDate,
    required this.category,
    this.isPaid = false,
    this.notes = '',
  });

  final String id;
  String name;
  double amount;
  String dueDate;
  String category;
  bool isPaid;
  String notes;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'amount': amount,
        'dueDate': dueDate,
        'category': category,
        'isPaid': isPaid,
        'notes': notes,
      };

  factory BillItem.fromJson(Map<String, dynamic> json) => BillItem(
        id: json['id'] as String,
        name: json['name'] as String? ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        dueDate: json['dueDate'] as String? ?? '',
        category: json['category'] as String? ?? 'Other',
        isPaid: json['isPaid'] as bool? ?? false,
        notes: json['notes'] as String? ?? '',
      );
}

class BudgetHome extends StatefulWidget {
  const BudgetHome({super.key});

  @override
  State<BudgetHome> createState() => _BudgetHomeState();
}

class _BudgetHomeState extends State<BudgetHome> {
  final NumberFormat currency = NumberFormat.currency(symbol: r'\$');
  final TextEditingController incomeController = TextEditingController();

  double monthlyIncome = 0;
  double carryOver = 0;
  List<BillItem> bills = [];

  String apiBaseUrl = '';
  String apiKey = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  double get totalExpenses => bills.fold(0, (sum, bill) => sum + bill.amount);
  double get totalPaid =>
      bills.where((bill) => bill.isPaid).fold(0, (sum, bill) => sum + bill.amount);
  double get totalRemaining =>
      bills.where((bill) => !bill.isPaid).fold(0, (sum, bill) => sum + bill.amount);
  double get endingBalance => monthlyIncome + carryOver - totalExpenses;

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final billsJson = prefs.getString('bills');

    setState(() {
      monthlyIncome = prefs.getDouble('monthlyIncome') ?? 0;
      carryOver = prefs.getDouble('carryOver') ?? 0;
      apiBaseUrl = prefs.getString('apiBaseUrl') ?? '';
      apiKey = prefs.getString('apiKey') ?? '';
      incomeController.text = monthlyIncome == 0 ? '' : monthlyIncome.toString();
      bills = billsJson == null
          ? _defaultBills()
          : (jsonDecode(billsJson) as List)
              .map((item) => BillItem.fromJson(item as Map<String, dynamic>))
              .toList();
    });
  }

  Future<void> _saveData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('monthlyIncome', monthlyIncome);
    await prefs.setDouble('carryOver', carryOver);
    await prefs.setString('apiBaseUrl', apiBaseUrl);
    await prefs.setString('apiKey', apiKey);
    await prefs.setString(
      'bills',
      jsonEncode(bills.map((bill) => bill.toJson()).toList()),
    );
  }

  List<BillItem> _defaultBills() {
    final today = DateTime.now();
    String due(int day) => DateFormat('MM/dd/yyyy').format(DateTime(today.year, today.month, day));

    return [
      BillItem(id: 'house', name: 'House Payment', amount: 0, dueDate: due(1), category: 'Housing'),
      BillItem(id: 'auto', name: 'Auto', amount: 0, dueDate: due(5), category: 'Vehicle'),
      BillItem(id: 'credit_cards', name: 'Credit Cards', amount: 0, dueDate: due(8), category: 'Debt'),
      BillItem(id: 'restaurant', name: 'Restaurant', amount: 0, dueDate: due(12), category: 'Food'),
      BillItem(id: 'lights', name: 'Lights', amount: 0, dueDate: due(10), category: 'Utilities'),
      BillItem(id: 'water', name: 'Water', amount: 0, dueDate: due(10), category: 'Utilities'),
      BillItem(id: 'fuel', name: 'Fuel', amount: 0, dueDate: due(15), category: 'Transportation'),
      BillItem(id: 'loans', name: 'Loans', amount: 0, dueDate: due(18), category: 'Debt'),
      BillItem(id: 'medical', name: 'Medical', amount: 0, dueDate: due(20), category: 'Healthcare'),
      BillItem(id: 'insurance', name: 'Insurance', amount: 0, dueDate: due(22), category: 'Insurance'),
    ];
  }

  Future<void> _showBillEditor({BillItem? bill}) async {
    final nameController = TextEditingController(text: bill?.name ?? '');
    final amountController = TextEditingController(
      text: bill == null || bill.amount == 0 ? '' : bill.amount.toString(),
    );
    final dueDateController = TextEditingController(
      text: bill?.dueDate ?? DateFormat('MM/dd/yyyy').format(DateTime.now()),
    );
    final categoryController = TextEditingController(text: bill?.category ?? 'Other');
    final notesController = TextEditingController(text: bill?.notes ?? '');

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bill == null ? 'Add Bill' : 'Edit Bill',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Bill name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: categoryController,
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: dueDateController,
                  decoration: const InputDecoration(labelText: 'Due date (MM/DD/YYYY)'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Notes'),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final amount = double.tryParse(amountController.text.trim()) ?? 0;
                    final updatedBill = BillItem(
                      id: bill?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                      name: nameController.text.trim().isEmpty ? 'New Bill' : nameController.text.trim(),
                      amount: amount,
                      dueDate: dueDateController.text.trim(),
                      category: categoryController.text.trim().isEmpty ? 'Other' : categoryController.text.trim(),
                      isPaid: bill?.isPaid ?? false,
                      notes: notesController.text.trim(),
                    );

                    setState(() {
                      if (bill == null) {
                        bills.add(updatedBill);
                      } else {
                        final index = bills.indexWhere((item) => item.id == bill.id);
                        if (index != -1) {
                          bills[index] = updatedBill;
                        }
                      }
                    });
                    await _saveData();
                    if (mounted) Navigator.pop(context);
                  },
                  child: Text(bill == null ? 'Add Bill' : 'Save Changes'),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showApiSettings() async {
    final baseUrlController = TextEditingController(text: apiBaseUrl);
    final apiKeyController = TextEditingController(text: apiKey);

    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('API Settings'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: baseUrlController,
                decoration: const InputDecoration(
                  labelText: 'Payment API base URL',
                  hintText: 'https://your-server.com',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: apiKeyController,
                decoration: const InputDecoration(
                  labelText: 'API key',
                  hintText: 'Paste your key here',
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'For production, move API keys into secure backend or encrypted storage.',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              setState(() {
                apiBaseUrl = baseUrlController.text.trim();
                apiKey = apiKeyController.text.trim();
              });
              await _saveData();
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _rollToNextMonth() async {
    final remaining = monthlyIncome + carryOver - totalPaid;

    setState(() {
      carryOver = remaining < 0 ? 0 : remaining;
      monthlyIncome = 0;
      incomeController.clear();
      bills = bills
          .map(
            (bill) => BillItem(
              id: bill.id,
              name: bill.name,
              amount: bill.amount,
              dueDate: bill.dueDate,
              category: bill.category,
              isPaid: false,
              notes: bill.notes,
            ),
          )
          .toList();
    });

    await _saveData();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('New month started. Carry over saved: ${currency.format(carryOver)}')),
    );
  }

  Future<void> _payBill(BillItem bill) async {
    try {
      if (apiBaseUrl.isNotEmpty && apiKey.isNotEmpty) {
        final uri = Uri.parse('${apiBaseUrl}/pay');
        final response = await http.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $apiKey',
          },
          body: jsonEncode({
            'billId': bill.id,
            'billName': bill.name,
            'amount': bill.amount,
            'dueDate': bill.dueDate,
            'category': bill.category,
            'notes': bill.notes,
          }),
        );

        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw Exception('Payment API failed with status ${response.statusCode}.');
        }
      }

      setState(() {
        bill.isPaid = true;
      });
      await _saveData();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            apiBaseUrl.isEmpty || apiKey.isEmpty
                ? 'Marked ${bill.name} as paid. Add API details to send real payment calls.'
                : 'Payment sent for ${bill.name}.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not process payment: $error')),
      );
    }
  }

  Widget _summaryCard(String title, String value, IconData icon) {
    return Expanded(
      child: Card(
        elevation: 0,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(fontSize: 12, color: Colors.black54)),
              const SizedBox(height: 6),
              Text(
                value,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _billTile(BillItem bill) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        title: Text(
          bill.name,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            decoration: bill.isPaid ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${bill.category} • Due ${bill.dueDate}'),
              if (bill.notes.isNotEmpty) Text(bill.notes),
              const SizedBox(height: 4),
              Text(
                currency.format(bill.amount),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        trailing: Wrap(
          spacing: 6,
          children: [
            IconButton(
              tooltip: 'Edit',
              onPressed: () => _showBillEditor(bill: bill),
              icon: const Icon(Icons.edit_outlined),
            ),
            IconButton(
              tooltip: 'Delete',
              onPressed: () async {
                setState(() => bills.removeWhere((item) => item.id == bill.id));
                await _saveData();
              },
              icon: const Icon(Icons.delete_outline),
            ),
            FilledButton.tonal(
              onPressed: bill.isPaid ? null : () => _payBill(bill),
              child: Text(bill.isPaid ? 'Paid' : 'Pay'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Budget Pro Premium'),
        actions: [
          IconButton(
            tooltip: 'API Settings',
            onPressed: _showApiSettings,
            icon: const Icon(Icons.key_outlined),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showBillEditor(),
        label: const Text('Add Bill'),
        icon: const Icon(Icons.add),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                elevation: 0,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Monthly Budget',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: incomeController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Monthly income',
                          prefixIcon: Icon(Icons.attach_money),
                        ),
                        onChanged: (value) async {
                          setState(() {
                            monthlyIncome = double.tryParse(value) ?? 0;
                          });
                          await _saveData();
                        },
                      ),
                      const SizedBox(height: 12),
                      Text('Carry over: ${currency.format(carryOver)}'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: _rollToNextMonth,
                              icon: const Icon(Icons.calendar_month),
                              label: const Text('Next Month'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  _summaryCard('Total Bills', currency.format(totalExpenses), Icons.receipt_long),
                  const SizedBox(width: 10),
                  _summaryCard('Paid', currency.format(totalPaid), Icons.check_circle_outline),
                ],
              ),
              Row(
                children: [
                  _summaryCard('Remaining', currency.format(totalRemaining), Icons.pending_actions),
                  const SizedBox(width: 10),
                  _summaryCard('End Balance', currency.format(endingBalance), Icons.account_balance_wallet_outlined),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Bills & Payments',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  TextButton.icon(
                    onPressed: _showApiSettings,
                    icon: const Icon(Icons.settings),
                    label: const Text('Payment API'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (bills.isEmpty)
                const Card(
                  elevation: 0,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No bills yet. Tap Add Bill to create one.'),
                  ),
                )
              else
                ...bills.map(_billTile),
            ],
          ),
        ),
      ),
    );
  }
}
