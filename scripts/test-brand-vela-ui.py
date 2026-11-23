#!/usr/bin/env python3
"""Regression checks for Vela's Fluent UI branding and damaged-file repair."""
from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("brand-vela-ui.py")
SPEC = importlib.util.spec_from_file_location("vela_brand_ui", SCRIPT)
assert SPEC and SPEC.loader
brand = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(brand)


class VelaBrandingTests(unittest.TestCase):
    def test_settings_keys_never_join(self):
        original = (
            "zen-settings-window-pane-shortcuts = Shortcuts\n"
            "zen-settings-window-pane-advanced = Advanced\n"
            "zen-settings-window-link-privacy = Privacy & Security\n"
            "zen-settings-window-title = Zen Browser Settings\n"
            "zen-settings-window-description = Customize Zen Browser\n"
        )
        expected = original.replace("Zen Browser", "Vela")
        actual = brand.convert_locale(original)
        self.assertEqual(actual, expected)
        self.assertEqual(actual.count("\n"), 5)
        self.assertFalse(brand.is_merged(actual))
        self.assertEqual(brand.convert_locale(actual), actual)

    def test_line_endings_placeables_and_keys(self):
        sample = (
            "zen-settings-window-help = Zen Browser Help\r\n"
            "zen-settings-window-variable = { -brand-short-name }\r\n"
            "-brand-short-name = Zen\r\n"
        )
        actual = brand.convert_locale(sample)
        self.assertEqual(actual.count("\r\n"), 3)
        self.assertEqual(actual.count("\n"), 3)
        self.assertEqual(actual.count("\r"), 3)
        self.assertIn("zen-settings-window-help = Vela Help\r\n", actual)
        self.assertIn("zen-settings-window-variable = { -brand-short-name }\r\n", actual)
        self.assertIn("-brand-short-name = Vela\r\n", actual)

    def test_detects_screenshot_style_corruption(self):
        broken = (
            "zen-settings-window-pane-shortcuts = "
            "Shortcutszen-settings-window-pane-advanced = "
            "Advancedzen-settings-window-link-privacy = Privacy & Security\n"
        )
        self.assertTrue(brand.is_merged(broken))
        self.assertFalse(brand.is_merged(
            "zen-settings-window-pane-shortcuts = Shortcuts\n"
            "zen-settings-window-pane-advanced = Advanced\n"
        ))

    def test_git_repair_only_corrupted_file_and_preserves_backup(self):
        with tempfile.TemporaryDirectory(prefix="vela-brand-test-") as temp:
            root = Path(temp) / "engine"
            path = root / "zen" / "locales" / "en-US" / "settings.ftl"
            path.parent.mkdir(parents=True)
            original = (
                "zen-settings-window-pane-shortcuts = Shortcuts\n"
                "zen-settings-window-pane-advanced = Advanced\n"
                "zen-settings-window-brand = Zen Browser\n"
            )
            path.write_text(original, encoding="utf-8")
            subprocess.run(["git", "-C", str(root), "init", "-q"], check=True)
            subprocess.run(
                ["git", "-C", str(root), "add", "zen/locales/en-US/settings.ftl"],
                check=True,
            )
            subprocess.run(
                ["git", "-C", str(root), "-c", "user.name=Vela Test",
                 "-c", "user.email=vela-test@example.invalid",
                 "commit", "-qm", "Pristine localization"],
                check=True,
            )
            broken = original.replace(
                "Shortcuts\nzen-settings", "Shortcutszen-settings"
            )
            path.write_text(broken, encoding="utf-8")
            saved_engine, saved_roots = brand.ENGINE, brand.LOCALE_ROOTS
            try:
                brand.ENGINE = root
                brand.LOCALE_ROOTS = (root / "zen",)
                self.assertEqual(brand.main([]), 0)
                repaired = path.read_text(encoding="utf-8")
                self.assertEqual(repaired, original.replace("Zen Browser", "Vela"))
                self.assertEqual(
                    path.with_name(path.name + ".vela-damaged-backup").read_text(
                        encoding="utf-8"
                    ),
                    broken,
                )
                self.assertEqual(brand.main([]), 0)
                self.assertEqual(path.read_text(encoding="utf-8"), repaired)
            finally:
                brand.ENGINE, brand.LOCALE_ROOTS = saved_engine, saved_roots


if __name__ == "__main__":
    unittest.main(verbosity=2)
