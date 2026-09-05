from PySide2.QtGui import QFont

BG = "#0d131a"
PANEL = "#111a22"
PANEL_2 = "#0b1219"
BORDER = "#2a3947"
TEXT = "#e8edf2"
MUTED = "#a6b0bb"
GREEN = "#67d35b"
BLUE = "#4f9cff"
PURPLE = "#b260d9"
ORANGE = "#f3a847"

def apply_theme(app):
    app.setStyle("Fusion")
    app.setFont(QFont("Arial", 10))
    app.setStyleSheet(f"""
        * {{ color: {TEXT}; font-family: Arial; }}
        QMainWindow, QWidget {{ background: {BG}; }}
        QToolTip {{ background: #18232d; border: 1px solid {BORDER}; padding: 6px; color: {TEXT}; }}
        QFrame#topbar {{ background: #101821; border-bottom: 1px solid #25323e; }}
        QFrame#footer {{ background: #0f171f; border-top: 1px solid #25323e; }}
        QLabel {{ background: transparent; }}
        QLabel#title {{ font-size: 16px; font-weight: 600; }}
        QLabel#pageTitle {{ font-size: 16px; font-weight: 600; }}
        QLabel#muted {{ color: {MUTED}; }}
        QLabel#section {{ font-size: 14px; font-weight: 600; color: #dfe6ec; }}
        QPushButton {{ background: #202b35; border: 1px solid #33424f; border-radius: 6px; padding: 7px 11px; min-height: 18px; }}
        QPushButton:hover {{ background: #293742; border-color: #4b5e6e; }}
        QPushButton:pressed {{ background: #17222b; }}
        QPushButton#nav {{ background: transparent; border: 1px solid transparent; padding: 8px 13px; }}
        QPushButton#nav:hover {{ background: #19242e; }}
        QPushButton#nav[active="true"] {{ background: #1a2c3c; border-color: #203f58; color: {BLUE}; }}
        QPushButton#accent, QPushButton#green {{ background: #193728; border-color: #2e6441; color: {GREEN}; }}
        QPushButton#blue {{ background: #172d43; border-color: #2b5279; color: {BLUE}; }}
        QPushButton#purple {{ background: #2b1b38; border-color: #5d3575; color: {PURPLE}; }}
        QPushButton#danger {{ color: #ff9b9b; }}
        QFrame#agentCard {{ background: {PANEL}; border: 1px solid {BORDER}; border-radius: 8px; }}
        QFrame#agentCard[accent="green"] {{ border-color: #36723b; }}
        QFrame#agentCard[accent="blue"] {{ border-color: #315d8f; }}
        QFrame#agentCard[accent="purple"] {{ border-color: #75438d; }}
        QFrame#tree {{ background: {PANEL_2}; border: 1px solid #253541; border-radius: 6px; }}
        QFrame#consolePanel {{ background: #090e13; border: 1px solid #263642; border-radius: 7px; }}
        QFrame#separator {{ color: #263540; background: #263540; max-height: 1px; }}
        QFrame#listRow {{ background: {PANEL}; border: 1px solid {BORDER}; border-radius: 7px; }}
        QTextEdit, QPlainTextEdit {{ background: #090e13; border: 0; selection-background-color: #28445b; font-family: Menlo, Monaco, monospace; font-size: 11px; }}
        QLineEdit {{ background: #121b23; border: 1px solid #2d3d49; border-radius: 5px; padding: 6px 8px; }}
        QComboBox {{ background: #121b23; border: 1px solid #2d3d49; border-radius: 5px; padding: 6px 8px; min-width: 130px; }}
        QComboBox QAbstractItemView {{ background: #121b23; border: 1px solid #2d3d49; selection-background-color: #243b4b; }}
        QCheckBox {{ spacing: 7px; }}
        QScrollArea {{ background: transparent; border: 0; }}
        QScrollBar:vertical {{ background: #0b1117; width: 9px; margin: 2px; }}
        QScrollBar::handle:vertical {{ background: #334451; border-radius: 4px; min-height: 24px; }}
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
        QSplitter::handle {{ background: #1b2730; }}
        QTabWidget::pane {{ border: 1px solid {BORDER}; border-radius: 6px; }}
        QTabBar::tab {{ background: #141e27; padding: 7px 12px; border: 1px solid {BORDER}; }}
        QTabBar::tab:selected {{ background: #1c2a35; }}
        /* Agent page visual layer: deliberately scoped so Dashboard keeps its original look. */
        QFrame#agentsHero {{ background: #101b25; border: 1px solid #294152; border-radius: 12px; }}
        QFrame#miniStat {{ background: #0b141c; border: 1px solid #273946; border-radius: 8px; min-width: 105px; }}
        QLabel#heroTitle {{ font-size: 24px; font-weight: 800; color: #f3f7fa; }}
        QLabel#agentName {{ font-size: 19px; font-weight: 700; }}
        QLabel#missionText {{ color: #dbe4ea; font-size: 12px; }}
        QLabel#statValue {{ font-size: 16px; font-weight: 700; }}
        QLabel#statusActive {{ color: {GREEN}; font-weight: 700; }}
        QLabel#statusInactive {{ color: {MUTED}; font-weight: 700; }}
        QFrame#missionCard {{ background: #111b24; border: 1px solid {BORDER}; border-radius: 12px; }}
        QFrame#missionCard[accent="green"] {{ border-color: #36723b; }}
        QFrame#missionCard[accent="blue"] {{ border-color: #315d8f; }}
        QFrame#missionCard[accent="purple"] {{ border-color: #75438d; }}
        QFrame#missionCard[accent="orange"] {{ border-color: #8c6430; }}
        QLabel#bigAvatar {{ background: #0a1118; border: 1px solid #334451; border-radius: 32px; font-size: 30px; }}
        QLabel#bigAvatar[accent="green"] {{ border-color: #36723b; }}
        QLabel#bigAvatar[accent="blue"] {{ border-color: #315d8f; }}
        QLabel#bigAvatar[accent="purple"] {{ border-color: #75438d; }}
        QLabel#bigAvatar[accent="orange"] {{ border-color: #8c6430; }}
        QLabel#agentChip {{ background: #17222c; border: 1px solid #2d3d49; border-radius: 10px; padding: 5px 8px; color: #cbd5dc; }}
        QLabel#agentChip[accent="green"] {{ color: {GREEN}; border-color: #315f3b; }}
        QLabel#agentChip[accent="blue"] {{ color: {BLUE}; border-color: #2d557c; }}
        QLabel#agentChip[accent="purple"] {{ color: {PURPLE}; border-color: #633b77; }}
        QFrame#promptPreview {{ background: #0b1219; border: 1px solid #24333e; border-radius: 8px; }}
        QFrame#addAgentCard {{ background: #0e171f; border: 1px dashed #3b4c59; border-radius: 12px; min-height: 250px; }}
        QLabel#addAgentIcon {{ font-size: 40px; color: #61717e; }}
        QFrame#agentEditor {{ background: {BG}; }}
    """)
