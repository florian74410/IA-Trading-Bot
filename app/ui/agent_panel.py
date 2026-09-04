from PySide2.QtWidgets import (
    QGroupBox,
    QVBoxLayout,
    QLabel,
    QPushButton
)


class AgentPanel(QGroupBox):

    def __init__(
        self,
        agent,
        start_callback,
        parent=None
    ):

        super().__init__(
            agent.name,
            parent
        )

        self.agent = agent

        layout = QVBoxLayout(self)

        description = QLabel(
            agent.description
        )

        description.setWordWrap(True)

        self.status = QLabel(
            "État : arrêté"
        )

        button = QPushButton(
            "Démarrer"
        )

        button.clicked.connect(
            lambda:
            start_callback(
                agent.agent_id
            )
        )

        layout.addWidget(
            description
        )

        layout.addWidget(
            self.status
        )

        layout.addWidget(
            button
        )

    def set_running(self):

        self.status.setText(
            "État : actif"
        )
