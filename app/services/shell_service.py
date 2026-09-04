import subprocess


class ShellService:

    def run(self, command):

        try:

            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                check=False
            )

            return (
                result.returncode,
                result.stdout,
                result.stderr
            )

        except Exception as exc:

            return (
                -1,
                "",
                str(exc)
            )
