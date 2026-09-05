import sys

from PySide2.QtWidgets import QApplication

from app.core.config import AppConfig, LOG_DIR
from app.core.logging_setup import install_exception_hook, setup_logging
from app.ui.main_window import MainWindow
from app.ui.settings_page import install_settings_page
from app.ui.theme import apply_theme


install_settings_page(MainWindow)


def main():
    config = AppConfig()
    config.ensure_directories()

    logger = setup_logging(LOG_DIR)
    install_exception_hook(logger)
    logger.info("Application starting")

    app = QApplication(sys.argv)
    app.setApplicationName("IA-TB_Dev_Updater")
    app.setOrganizationName("IA-TB")

    apply_theme(app)

    window = MainWindow()
    window.show()

    def on_quit():
        logger.info("Application stopping cleanly")

    app.aboutToQuit.connect(on_quit)

    exit_code = app.exec_()
    logger.info("Application exited with code %s", exit_code)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
