from PySide2.QtCore import QObject, Signal


class Orchestrator(QObject):

    log_message = Signal(str, str)

    def __init__(self):

        super().__init__()

        self.agents = {}

    def register(self, agent):

        self.agents[
            agent.agent_id
        ] = agent

    def start_agent(self, agent_id):

        agent = self.agents.get(
            agent_id
        )

        if not agent:

            self.log_message.emit(
                "SYSTEM",
                f"Agent inconnu : {agent_id}"
            )

            return

        self.log_message.emit(
            agent.name,
            "Démarrage de l'agent..."
        )

        result = agent.run()

        if result:

            self.log_message.emit(
                agent.name,
                result
            )

    def broadcast(self, message):

        for agent in self.agents.values():

            agent.receive_message(
                message
            )
