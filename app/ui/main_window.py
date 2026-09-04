from PySide2.QtWidgets import (
    QMainWindow,
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QTextEdit,
    QGroupBox
)

from app.core.config import AppConfig

from app.core.orchestrator import Orchestrator

from app.agents.puce import PuceAgent
from app.agents.geek import GeekAgent
from app.agents.archiviste import ArchivisteAgent

from app.services.git_service import GitService
from app.services.github_service import GitHubService
from app.services.openai_service import OpenAIService

from app.ui.agent_panel import AgentPanel


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

        self.orchestrator.register(
            self.puce
        )

        self.orchestrator.register(
            self.geek
        )

        self.orchestrator.register(
            self.archiviste
        )

        self.panels = {}

        self.setWindowTitle(
            "IA-TB_Dev_Updater"
        )

        self.resize(
            1000,
            700
        )

        self.build_ui()

        self.orchestrator.log_message.connect(
            self.add_log
        )

        self.add_log(
            "SYSTEM",
            "IA-TB_Dev_Updater démarré."
        )

        self.add_log(
            "SYSTEM",
            self.git.version()
        )

    def build_ui(self):

        central = QWidget()

        self.setCentralWidget(
            central
        )

        main_layout = QVBoxLayout(
            central
        )

        title = QLabel(
            "IA-TB_Dev_Updater"
        )

        title.setStyleSheet(
            "font-size: 26px; font-weight: bold;"
        )

        subtitle = QLabel(
            "Gestionnaire de développement et coordination des agents"
        )

        main_layout.addWidget(
            title
        )

        main_layout.addWidget(
            subtitle
        )

        agents_box = QGroupBox(
            "Agents IA"
        )

        agents_layout = QHBoxLayout(
            agents_box
        )

        agents = [
            self.puce,
            self.geek,
            self.archiviste
        ]

        for agent in agents:

            panel = AgentPanel(
                agent,
                self.start_agent
            )

            self.panels[
                agent.agent_id
            ] = panel

            agents_layout.addWidget(
                panel
            )

        main_layout.addWidget(
            agents_box
        )

        controls = QHBoxLayout()

        test_button = QPushButton(
            "Tester les services"
        )

        test_button.clicked.connect(
            self.test_services
        )

        start_all_button = QPushButton(
            "Démarrer tous les agents"
        )

        start_all_button.clicked.connect(
            self.start_all
        )

        controls.addWidget(
            test_button
        )

        controls.addWidget(
            start_all_button
        )

        main_layout.addLayout(
            controls
        )

        log_box = QGroupBox(
            "Journal système"
        )

        log_layout = QVBoxLayout(
            log_box
        )

        self.log_view = QTextEdit()

        self.log_view.setReadOnly(
            True
        )

        log_layout.addWidget(
            self.log_view
        )

        main_layout.addWidget(
            log_box
        )

    def add_log(
        self,
        source,
        message
    ):

        self.log_view.append(
            f"[{source}] {message}"
        )

    def start_agent(
        self,
        agent_id
    ):

        self.orchestrator.start_agent(
            agent_id
        )

        panel = self.panels.get(
            agent_id
        )

        if panel:

            panel.set_running()

    def start_all(self):

        for agent in (
            self.orchestrator.agents.values()
        ):

            self.start_agent(
                agent.agent_id
            )

    def test_services(self):

        github_ok, github_message = (
            self.github.test_connection()
        )

        openai_ok, openai_message = (
            self.openai.test_connection()
        )

        self.add_log(
            "Git",
            self.git.version()
        )

        self.add_log(
            "GitHub",
            github_message
        )

        self.add_log(
            "OpenAI",
            openai_message
        )
