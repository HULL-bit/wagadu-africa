import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Même palette que le site public et le Hub web (`tailwind.config.ts`
/// dans `site/` et `intranet/frontend/`) — une seule identité de marque
/// Wagadu, peu importe la plateforme.
class WagaduColors {
  static const ivory = Color(0xFFFBF6EC);
  static const sand = Color(0xFFF0E4C8);
  static const gold = Color(0xFFF6BB24);
  static const amber = Color(0xFFFFA900);
  static const terracotta = Color(0xFFD2812E);
  static const brown = Color(0xFF6E3C13);
  static const bark = Color(0xFF4A2A12);
  static const ebony = Color(0xFF1E0F04);
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: WagaduColors.terracotta,
        brightness: Brightness.light,
        primary: WagaduColors.terracotta,
        secondary: WagaduColors.amber,
        surface: WagaduColors.ivory,
      ),
      scaffoldBackgroundColor: WagaduColors.ivory,
    );
    final textTheme = GoogleFonts.workSansTextTheme(base.textTheme);
    final displayFont = GoogleFonts.fraunces();
    return base.copyWith(
      textTheme: textTheme.copyWith(
        headlineLarge: textTheme.headlineLarge?.copyWith(fontFamily: displayFont.fontFamily),
        headlineMedium: textTheme.headlineMedium?.copyWith(fontFamily: displayFont.fontFamily),
        headlineSmall: textTheme.headlineSmall?.copyWith(fontFamily: displayFont.fontFamily),
        titleLarge: textTheme.titleLarge?.copyWith(fontFamily: displayFont.fontFamily),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: WagaduColors.ivory,
        foregroundColor: WagaduColors.ebony,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontFamily: displayFont.fontFamily,
          color: WagaduColors.ebony,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        elevation: 0,
        color: Colors.white,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
          side: BorderSide(color: WagaduColors.sand),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: WagaduColors.terracotta,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: WagaduColors.sand),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: WagaduColors.sand),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: WagaduColors.terracotta, width: 1.5),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: WagaduColors.amber.withValues(alpha: 0.25),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? WagaduColors.ebony : WagaduColors.ebony.withValues(alpha: 0.6),
          );
        }),
      ),
    );
  }
}
