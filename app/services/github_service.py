class GitHubService:

    def __init__(self):

        self.configured = False

    def test_connection(self):

        return (
            False,
            "GitHub non configuré."
        )
