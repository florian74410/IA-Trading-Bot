import sys

from PySide2.QtWidgets import QApplication

from app.ui.main_window import MainWindow
from app.ui.settings_page import install_settings_page
from app.ui.theme import apply_theme


install_settings_page(MainWindow)


def main():

    app = QApplication(
        sys.argv
    )

    app.setApplicationName(
        "IA-TB_Dev_Updater"
    )

    app.setOrganizationName(
        "IA-TB"
    )

    apply_theme(
        app
    )

    window = MainWindow()

    window.show()

    sys.exit(
        app.exec_()
    )


if __name__ == "__main__":

    main()
