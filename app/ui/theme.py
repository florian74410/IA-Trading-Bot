from PySide2.QtGui import QFont


def apply_theme(app):

    app.setStyle("Fusion")

    app.setFont(
        QFont("Arial", 11)
    )

    app.setStyleSheet("""
        QMainWindow {
            background: #17191f;
        }

        QWidget {
            color: #e8e8e8;
            background: #17191f;
        }

        QGroupBox {
            border: 1px solid #3b3f48;
            border-radius: 8px;
            margin-top: 12px;
            padding: 10px;
        }

        QGroupBox::title {
            subcontrol-origin: margin;
            left: 12px;
            padding: 0 5px;
        }

        QPushButton {
            background: #2d313a;
            border: 1px solid #4a4f5a;
            border-radius: 6px;
            padding: 8px 14px;
        }

        QPushButton:hover {
            background: #3a3f4a;
        }

        QTextEdit {
            background: #101216;
            border: 1px solid #3b3f48;
            border-radius: 6px;
        }

        QLabel {
            padding: 2px;
        }
    """)
