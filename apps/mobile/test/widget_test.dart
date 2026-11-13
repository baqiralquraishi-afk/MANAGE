import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/main.dart';

void main() {
  testWidgets('HumanityMobileApp launches with Arabic RTL default and Login screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: HumanityMobileApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Arabic app title and sign in screen
    expect(find.text('تطبيق المسح الميداني — إنسانية'), findsOneWidget);
    expect(find.text('تسجيل دخول الكادر الميداني'), findsOneWidget);
    expect(find.text('English'), findsOneWidget);

    // Toggle language to English
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();

    expect(find.text('Humanity Field Caseworker'), findsOneWidget);
    expect(find.text('Field Staff Sign In'), findsOneWidget);
    expect(find.text('عربي'), findsOneWidget);
  });
}
