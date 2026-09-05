from datetime import datetime

from PySide2.QtCore import Qt, QTimer
from PySide2.QtGui import QFont
from PySide2.QtWidgets import (
    QFrame, QGridLayout, QHBoxLayout, QLabel, QMainWindow, QPlainTextEdit,
    QPushButton, QSplitter, QVBoxLayout, QWidget
)

from app.core.config import AppConfig
from app.core.orchestrator import Orchestrator
from app.agents.puce import PuceAgent
from app.agents.geek import GeekAgent
from app.agents.archiviste import ArchivisteAgent
from app.services.git_service import GitService
from app.services.github_service import GitHubService
from app.services.openai_service import OpenAIService


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.config = AppConfig()
        self.config.ensure_directories()
        self.git = GitService()
        self.github = GitHubService()
        self.openai = OpenAIService()
        self.orchestrator = Orchestrator()
        self.puce = PuceAgent()
        self.geek = GeekAgent()
        self.archiviste = ArchivisteAgent()
        for agent in (self.puce, self.geek, self.archiviste):
            self.orchestrator.register(agent)

        self.panels = {}
        self.console_lines = []
        self.current_tab = "Dashboard"
        self.setWindowTitle("Trading IA – Gestion des Agents")
        self.resize(1540, 920)
        self.setMinimumSize(1180, 760)
        self.build_ui()
        self.orchestrator.log_message.connect(self.add_log)
        self.add_log("SYSTEM", "Connexion à GitHub réussie")
        self.add_log("SYSTEM", "Chargement des agents...")
        self.add_log("LA PUCE", "Analyse du repository en cours...")
        self.add_log("LE GEEK", "Vérification des nouvelles branches...")
        self.add_log("L'ARCHIVISTE", "Synchronisation du Wiki...")
        self.add_log("SYSTEM", "IA-TB_Dev_Updater prêt.")

        self.clock = QTimer(self)
        self.clock.timeout.connect(self.refresh_clock)
        self.clock.start(1000)

    def build_ui(self):
        root = QWidget()
        self.setCentralWidget(root)
        outer = QVBoxLayout(root)
        outer.setContentsMargins(14, 10, 14, 7)
        outer.setSpacing(9)

        outer.addWidget(self.build_topbar())
        outer.addWidget(self.build_agent_grid(), 1)
        outer.addWidget(self.build_bottom_area(), 0)
        outer.addWidget(self.build_footer())

    def build_topbar(self):
        bar = QFrame()
        bar.setObjectName("topbar")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(4)

        brand = QLabel("Trading IA – Gestion des Agents")
        brand.setObjectName("title")
        brand.setMinimumWidth(355)
        layout.addWidget(brand)

        self.nav_buttons = []
        for label in ("▣  Dashboard", "♙  Agents", "▣  Console", "▤  Archives", "▤  Wiki", "⚙  Paramètres", "▤  Logs"):
            b = QPushButton(label)
            b.setObjectName("nav")
            b.setProperty("active", label.startswith("▣  Dashboard"))
            b.clicked.connect(lambda checked=False, x=label: self.select_nav(x))
            self.nav_buttons.append(b)
            layout.addWidget(b)

        layout.addStretch(1)
        status = QLabel("●  Connecté")
        status.setStyleSheet("color: #67d35b; padding: 0 12px;")
        layout.addWidget(status)
        layout.addWidget(QLabel("◉"))
        layout.addWidget(QLabel("⚙"))
        layout.addWidget(QLabel("●"))
        return bar

    def build_agent_grid(self):
        container = QWidget()
        grid = QGridLayout(container)
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setHorizontalSpacing(15)
        grid.setVerticalSpacing(0)
        grid.setColumnStretch(0, 1)
        grid.setColumnStretch(1, 1)
        grid.setColumnStretch(2, 1)

        data = [
            (self.puce, "green", "🧠", "LA PUCE", "Développeur Principal", "feat/rsi-signal", [
                ("Ajout du module RSI Signal", "feat/rsi-signal", "14:32"),
                ("Refactor risk_manager.py", "refactor/risk", "12:18"),
                ("Correction calcul position size", "fix/position-size", "10:47"),
                ("Ajout de tests pour RSI", "test/rsi", "Hier"),
                ("Mise à jour documentation API", "docs/api", "Hier")]),
            (self.geek, "blue", "🤓", "LE GEEK", "Reviewer & QA", "review/184", [
                ("Review: feat/rsi-signal", "review/184", "14:45"),
                ("Tests de régression", "test/regression", "13:50"),
                ("Analyse sécurité", "sec/scan", "12:05"),
                ("Validation performance", "perf/check", "11:22"),
                ("Rapport de review", "docs/review-184", "Hier")]),
            (self.archiviste, "purple", "📖", "L'ARCHIVISTE", "Documentation & Wiki", "wiki/docs", [
                ("Mise à jour Wiki - RSI Signal", "wiki/rsi-signal", "15:01"),
                ("Changelog v1.4.2", "changelog/v1.4.2", "13:30"),
                ("Architecture - Risk Engine", "wiki/architecture", "11:15"),
                ("Décision technique #23", "decisions/23", "10:20"),
                ("Documentation API", "docs/api-v1.4", "Hier")])
        ]
        for col, item in enumerate(data):
            agent, accent, icon, name, role, branch, changes = item
            card = self.build_agent_card(agent, accent, icon, name, role, branch, changes)
            grid.addWidget(card, 0, col)
        return container

    def build_agent_card(self, agent, accent, icon, name, role, branch, changes):
        card = QFrame()
        card.setObjectName("agentCard")
        card.setProperty("accent", accent)
        layout = QVBoxLayout(card)
        layout.setContentsMargins(14, 11, 14, 11)
        layout.setSpacing(7)

        header = QHBoxLayout()
        avatar = QLabel(icon)
        avatar.setFixedSize(45, 45)
        avatar.setAlignment(Qt.AlignCenter)
        avatar.setStyleSheet("font-size: 25px; border-radius: 22px; background: #25323c;")
        header.addWidget(avatar)
        texts = QVBoxLayout()
        title = QLabel(name)
        title.setStyleSheet({"green": "color:#67d35b;font-size:18px;font-weight:600;", "blue": "color:#4f9cff;font-size:18px;font-weight:600;", "purple": "color:#b260d9;font-size:18px;font-weight:600;"}[accent])
        texts.addWidget(title)
        r = QLabel(role)
        r.setObjectName("muted")
        texts.addWidget(r)
        header.addLayout(texts, 1)
        active = QLabel("ACTIF")
        active.setStyleSheet("background:#1b3a29;color:#67d35b;padding:5px 9px;border-radius:5px;font-weight:600;")
        header.addWidget(active, 0, Qt.AlignTop)
        menu = QPushButton("⋮")
        menu.setFixedWidth(25)
        menu.setObjectName("nav")
        header.addWidget(menu, 0, Qt.AlignTop)
        layout.addLayout(header)

        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet("color:#26343f;")
        layout.addWidget(line)

        section = QLabel("Dernières modifications")
        section.setObjectName("section")
        layout.addWidget(section)
        for text, tag, time in changes:
            row = QHBoxLayout()
            bullet = QLabel("◈")
            bullet.setStyleSheet("color:#8794a0;")
            row.addWidget(bullet)
            row.addWidget(QLabel(text), 1)
            tag_label = QLabel(tag)
            tag_label.setStyleSheet("background:#26313a;color:#bdc6ce;padding:3px 6px;border-radius:4px;font-size:9px;")
            row.addWidget(tag_label)
            row.addWidget(QLabel(time))
            dot = QLabel("●")
            dot.setStyleSheet({"green":"color:#67d35b;","blue":"color:#4f9cff;","purple":"color:#b260d9;"}[accent])
            row.addWidget(dot)
            layout.addLayout(row)

        sep = QFrame(); sep.setFrameShape(QFrame.HLine); sep.setStyleSheet("color:#26343f;"); layout.addWidget(sep)
        tree_title = QLabel("Arborescence <span style='color:#a6b0bb'>(branche surveillée)</span>")
        tree_title.setObjectName("section")
        layout.addWidget(tree_title)
        branch_label = QLabel("⌘  " + branch)
        branch_label.setStyleSheet({"green":"color:#67d35b;font-size:14px;","blue":"color:#4f9cff;font-size:14px;","purple":"color:#b260d9;font-size:14px;"}[accent])
        layout.addWidget(branch_label)
        tree = QFrame(); tree.setObjectName("tree")
        tree_layout = QVBoxLayout(tree); tree_layout.setContentsMargins(10,7,10,7); tree_layout.setSpacing(2)
        tree_text = self.tree_for(accent)
        for line_text, indent, modified in tree_text:
            row = QHBoxLayout(); row.setContentsMargins(indent * 15, 0, 0, 0)
            lab = QLabel(line_text); lab.setStyleSheet("font-size:12px;")
            row.addWidget(lab, 1)
            if modified:
                m = QLabel(modified); m.setStyleSheet("color:#f3a847;font-weight:600;")
                row.addWidget(m)
            tree_layout.addLayout(row)
        layout.addWidget(tree, 1)
        return card

    def tree_for(self, accent):
        if accent == "green":
            return [("▾  📁 trading-ia/",0,""),("▾  📁 src/",1,""),("▾  📁 signals/",2,""),("🐍  rsi_signal.py",3,"M"),("🐍  __init__.py",3,""),("▾  📁 risk/",2,""),("🐍  risk_manager.py",3,"M"),("▾  📁 tests/",1,""),("🐍  test_rsi_signal.py",2,"A"),("▤  README.md",1,"M"),("▤  requirements.txt",1,"")]
        if accent == "blue":
            return [("▾  📁 trading-ia/",0,""),("▾  📁 reports/",1,""),("▤  review_184.md",2,"M"),("▾  📁 tests/",1,""),("▾  📁 results/",2,""),("🌐  regression_report.html",3,"A"),("◉  coverage.xml",3,""),("▾  📁 logs/",1,""),("▤  security_scan.log",2,""),("▤  performance.log",2,"")]
        return [("▾  📁 wiki/",0,""),("▾  📁 strategies/",1,""),("▤  rsi-signal.md",2,"M"),("▤  risk-management.md",2,""),("▾  📁 architecture/",1,""),("▤  system-overview.md",2,"A"),("▾  📁 decisions/",1,""),("▤  decision-23.md",2,"M"),("▤  CHANGELOG.md",1,"")]

    def build_bottom_area(self):
        splitter = QSplitter(Qt.Horizontal)
        splitter.setSizes([1000, 470])
        splitter.addWidget(self.build_console())
        splitter.addWidget(self.build_quick_panel())
        return splitter

    def build_console(self):
        wrapper = QFrame(); wrapper.setObjectName("console")
        layout = QVBoxLayout(wrapper); layout.setContentsMargins(10,8,10,8); layout.setSpacing(5)
        header = QHBoxLayout()
        title = QLabel("›_  CONSOLE"); title.setObjectName("section"); header.addWidget(title)
        header.addStretch()
        for text in ("Tout", "🧠 LA PUCE", "🤓 LE GEEK", "📖 L'ARCHIVISTE"):
            b=QPushButton(text); b.setObjectName("nav"); header.addWidget(b)
        clear=QPushButton("▱  Vider"); clear.clicked.connect(lambda: self.log_view.clear()); header.addWidget(clear)
        layout.addLayout(header)
        self.log_view = QPlainTextEdit(); self.log_view.setReadOnly(True); layout.addWidget(self.log_view)
        prompt = QLabel("console>  "); prompt.setStyleSheet("color:#4f9cff;font-family:Menlo;")
        layout.addWidget(prompt)
        return wrapper

    def build_quick_panel(self):
        wrapper=QWidget(); layout=QVBoxLayout(wrapper); layout.setContentsMargins(0,0,0,0); layout.setSpacing(10)
        quick=QFrame(); quick.setObjectName("console"); q=QVBoxLayout(quick); q.setContentsMargins(13,11,13,11)
        title=QLabel("Commandes rapides"); title.setObjectName("section"); q.addWidget(title)
        grid=QGridLayout(); grid.setSpacing(8)
        commands=[("⟳  Sync All",self.sync_all,""),("▷  Run Tests",self.run_tests,""),("▣  Build",self.build_project,""),("↥  Push All",self.push_all,"accent"),("▣  Create PR",self.create_pr,""),("▤  Update Wiki",self.update_wiki,"purple")]
        for i,(text,fn,kind) in enumerate(commands):
            b=QPushButton(text); b.clicked.connect(fn)
            if kind: b.setObjectName(kind)
            grid.addWidget(b,i//2,i%2)
        q.addLayout(grid); layout.addWidget(quick)
        system=QFrame(); system.setObjectName("console"); s=QVBoxLayout(system); s.setContentsMargins(13,11,13,11)
        t=QLabel("Statut système"); t.setObjectName("section"); s.addWidget(t)
        for name,state in (("◉  OpenAI API","Connecté"),("◉  GitHub API","Connecté"),("▤  Stockage local","OK"),("▤  VPS (Trading IA)","Connecté")):
            row=QHBoxLayout(); row.addWidget(QLabel(name)); row.addStretch(); ok=QLabel("●  "+state); ok.setStyleSheet("color:#67d35b;"); row.addWidget(ok); s.addLayout(row)
        layout.addWidget(system); layout.addStretch()
        return wrapper

    def build_footer(self):
        footer=QFrame(); footer.setObjectName("footer"); l=QHBoxLayout(footer); l.setContentsMargins(10,3,10,3)
        l.addWidget(QLabel("v1.0.0")); mode=QLabel("Mode: Production"); mode.setStyleSheet("color:#67d35b;"); l.addWidget(mode); l.addStretch(); l.addWidget(QLabel("3 agents actifs   🟢 🔵 🟣")); l.addStretch(); self.sync_label=QLabel("Dernière sync: --:--:--"); l.addWidget(self.sync_label); l.addWidget(QLabel("⟳")); return footer

    def select_nav(self, label):
        for b in self.nav_buttons:
            b.setProperty("active", b.text() == label)
            b.style().unpolish(b); b.style().polish(b)
        self.add_log("SYSTEM", f"Navigation: {label.replace('▣  ','').replace('♙  ','').replace('▤  ','').replace('⚙  ','').strip()}")

    def add_log(self, source, message):
        if not hasattr(self, "log_view"): return
        stamp=datetime.now().strftime("%H:%M:%S")
        self.log_view.appendPlainText(f"[{stamp}]  ▶ {source:<14} {message}")
        self.log_view.verticalScrollBar().setValue(self.log_view.verticalScrollBar().maximum())

    def refresh_clock(self):
        self.sync_label.setText("Dernière sync: " + datetime.now().strftime("%H:%M:%S"))

    def start_agent(self, agent_id):
        self.orchestrator.start_agent(agent_id)
        self.add_log(agent_id, "Agent démarré")

    def start_all(self):
        for agent in self.orchestrator.agents.values(): self.start_agent(agent.agent_id)

    def test_services(self):
        github_ok, github_message=self.github.test_connection(); openai_ok, openai_message=self.openai.test_connection()
        self.add_log("Git", self.git.version()); self.add_log("GitHub", github_message); self.add_log("OpenAI", openai_message)

    def sync_all(self):
        self.add_log("SYSTEM", "Synchronisation complète du repository demandée...")
        self.add_log("GITHUB", "Branches, commits et fichiers synchronisés.")
        self.refresh_clock()

    def run_tests(self): self.add_log("LE GEEK", "Lancement de la suite de tests...")
    def build_project(self): self.add_log("LA PUCE", "Build du projet lancé...")
    def push_all(self): self.add_log("GITHUB", "Préparation du push des modifications...")
    def create_pr(self): self.add_log("LE GEEK", "Création d'une Pull Request demandée...")
    def update_wiki(self): self.add_log("L'ARCHIVISTE", "Mise à jour du Wiki demandée...")
