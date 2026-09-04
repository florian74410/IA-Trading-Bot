from .base import BaseAgent


class PuceAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            "puce",
            "Puce",
            "Agent chargé de l'analyse et du développement."
        )

    def run(self):

        self.running = True

        return (
            "Puce : environnement de développement prêt."
        )
