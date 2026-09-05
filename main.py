import logging
import sys

from PySide2.QtWidgets import QApplication, QMessageBox

from app.core.config import APP_NAME, AppConfig, LOG_DIR
from app.core.logging_setup import install_exception_hook, setup_logging
from app.core.startup import format_startup_report, run_startup_checks, startup_ok
from app.ui.main_window import MainWindow
from app.ui.settings_page import install_settings_page
from app.ui.theme import apply_theme


install_settings_page(MainWindow)


def _fallback_logger():
    logger = logging.getLogger("ia_tb_dev_updater.bootstrap")
    if not logger.handlers:
        logger.addHandler(logging.StreamHandler(sys.stderr))
    logger.setLevel(logging.INFO)
    return logger


def main():
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("IA-TB")

    logger = _fallback_logger()

    try:
        config = AppConfig()
        config.ensure_directories()
        logger = setup_logging(LOG_DIR)
        install_exception_hook(logger)

        checks = run_startup_checks(config.workspace)
        report = format_startup_report(checks)
        logger.info("Startup checks:\n%s", report)

        if not startup_ok(checks):
            logger.error("Startup aborted because one or more checks failed")
            QMessageBox.critical(
                None,
                "IA-TB_Dev_Updater — démarrage impossible",
                "Le socle local a détecté un problème bloquant :\n\n" + report,
            )
            return 1

        apply_theme(app)
        logger.info("Application starting")

        window = MainWindow()
        window.show()

        def on_quit():
            logger.info("Application stopping cleanly")

        app.aboutToQuit.connect(on_quit)

        exit_code = app.exec_()
        logger.info("Application exited with code %s", exit_code)
        return exit_code

    except Exception as exc:
        logger.exception("Fatal error during application bootstrap")
        QMessageBox.critical(
            None,
            "IA-TB_Dev_Updater — erreur fatale",
            "Le programme n'a pas pu terminer son démarrage.\n\n"
            f"{type(exc).__name__}: {exc}",
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
