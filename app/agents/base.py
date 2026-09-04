class BaseAgent:

    def __init__(
        self,
        agent_id,
        name,
        description=""
    ):

        self.agent_id = agent_id

        self.name = name

        self.description = description

        self.running = False

    def run(self):

        self.running = True

        return f"{self.name} démarré."

    def receive_message(self, message):

        return (
            f"{self.name} reçoit : {message}"
        )
