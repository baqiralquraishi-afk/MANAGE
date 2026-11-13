import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:humanity_mobile/core/theme/app_theme.dart';

void main() {
  group('Responsive Layout Tests (Phone vs Tablet)', () {
    testWidgets('Detects phone layout when width is less than 600', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      late bool isTabletResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              isTabletResult = AppTheme.isTablet(context);
              return Container();
            },
          ),
        ),
      );

      expect(isTabletResult, false, reason: '390px width must be identified as phone layout');
    });

    testWidgets('Detects tablet layout when width is 600 or greater', (tester) async {
      tester.view.physicalSize = const Size(800, 1280);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      late bool isTabletResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              isTabletResult = AppTheme.isTablet(context);
              return Container();
            },
          ),
        ),
      );

      expect(isTabletResult, true, reason: '800px width must be identified as tablet layout');
    });
  });
}
