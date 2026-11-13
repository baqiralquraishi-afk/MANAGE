import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/main.dart';

void main() {
  testWidgets('HumanityMobileApp launches with Arabic RTL default title', (WidgetTester tester) async {
    await tester.pumpWidget(const HumanityMobileApp());
    expect(find.text('تطبيق المسح الميداني — إنسانية'), findsOneWidget);
  });
}

