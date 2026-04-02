Budget Pro Premium - iOS-ready source package

What is included:
- Fixed Flutter source code for the updated premium budget app
- Insurance as a built-in bill
- Add / edit / delete custom bills
- Payment API settings
- Pay buttons for bills
- Carry-over to next month

Important about iOS:
- I made the SOURCE ready to take into a real Flutter project for iPhone/iPad.
- A true iOS installable app (.ipa) still must be built on a Mac with Xcode and an Apple Developer signing profile.
- Without macOS + Xcode, I cannot generate a real installable iOS package from this environment.

How to make it installable on iPhone/iPad:
1. Install Flutter on a Mac
2. Run: flutter create .
3. Replace lib/main.dart and pubspec.yaml with the files in this package
4. Run: flutter pub get
5. Run: flutter build ios --release
6. Open ios/Runner.xcworkspace in Xcode
7. Set your Team, Bundle Identifier, and signing
8. Archive and export/TestFlight from Xcode

You can also run it locally on iOS simulator with:
flutter run -d ios

Real payments:
- Real payment processing still requires your own backend/payment provider.
- The app posts payment data to: {baseUrl}/pay
