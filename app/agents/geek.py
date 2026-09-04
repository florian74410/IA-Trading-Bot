from .base import BaseAgent


class GeekAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            "geek",
            "Geek",
            "Agent chargé de la partie technique et informatique."
        )

    def run(self):

        self.running = True

        return (
            "Geek : environnement technique prêt."
        )
