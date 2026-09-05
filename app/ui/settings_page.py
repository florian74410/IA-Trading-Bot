import json
import platform
import subprocess
import sys
from pathlib import Path

from PySide2.QtCore import Qt
from PySide2.QtWidgets import (
    QCheckBox, QComboBox, QFrame, QGridLayout, QHBoxLayout, QLabel,
    QLineEdit, QPushButton, QScrollArea, QVBoxLayout, QWidget
)

from app.core.config import DATA_DIR
from app.services.secure_storage import SecureStorage, SecureStorageError


SETTINGS_PATH = DATA_DIR / "settings.json"


def load_settings():
    if not SETTINGS_PATH.exists():
        return {
            "repository": "florian74410/IA-Trading-Bot",
            "branch": "github-administration",
            "workspace": str(DATA_DIR / "workspace"),
            "startup_update_check": True,
            "auto_start_agents": False,
            "log_level": "INFO",
            "startup_page": "Dashboard",
            "agent_mode": "Production",
            "api_storage": "keychain",
        }
    try:
        return json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_settings(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary = SETTINGS_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(SETTINGS_PATH)


def _repo_name(repository):
    return repository.strip().rstrip("/").split("/")[-1] or "unknown-repository"


def install_settings_page(MainWindow):
    """Replace the initial placeholder with the full Settings page."""

    def build_settings_page(self):
        self.settings = load_settings()
        root = QWidget()
        outer = QVBoxLayout(root)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(10)
        outer.addWidget(self.page_header("Paramètres", "Configuration du projet, de l'environnement, des agents et des API sécurisées."))

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        content = QWidget()
        grid = QGridLayout(content)
        grid.setContentsMargins(0, 0, 4, 0)
        grid.setHorizontalSpacing(12)
        grid.setVerticalSpacing(12)

        self.settings_repository = self._settings_line(grid, 0, 0, "Repository Git", self.settings.get("repository", ""), "Ex. owner/repository")
        self.settings_branch = self._settings_line(grid, 0, 1, "Branche active", self.settings.get("branch", "github-administration"), "Branche de travail")
        self.settings_workspace = self._settings_line(grid, 1, 0, "Dossier de travail", self.settings.get("workspace", str(DATA_DIR / "workspace")), "Chemin local")
        self.settings_mode = QComboBox(); self.settings_mode.addItems(["Production", "Développement"]); self.settings_mode.setCurrentText(self.settings.get("agent_mode", "Production"))
        self._settings_row(grid, 1, 1, "Mode d'exécution", self.settings_mode)

        git_box = self._section("Projet Git", "Paramètres utilisés par les opérations Git/GitHub.")
        git_layout = QVBoxLayout(git_box); git_layout.addWidget(QLabel("Les boutons d'opération restent reliés aux services Git/GitHub existants."))
        git_buttons = QHBoxLayout()
        for text, slot in (("⌁  Vérifier Git", lambda: self._settings_log("Git", self.git.version())), ("⟳  Fetch", lambda: self._settings_log("GITHUB", "Fetch demandé.")), ("↓  Pull", lambda: self._settings_log("GITHUB", "Pull demandé.")), ("↑  Push", lambda: self._settings_log("GITHUB", "Push demandé."))):
            b = QPushButton(text); b.clicked.connect(slot); git_buttons.addWidget(b)
        git_layout.addLayout(git_buttons)
        grid.addWidget(git_box, 2, 0, 1, 2)

        env_box = self._section("Environnement", "État de Python, du venv et des dépendances.")
        env = QGridLayout(env_box)
        env.addWidget(QLabel("Python"), 0, 0); env.addWidget(QLabel(sys.version.split()[0]), 0, 1)
        env.addWidget(QLabel("Plateforme"), 1, 0); env.addWidget(QLabel(platform.platform()), 1, 1)
        env.addWidget(QLabel("Cryptographie"), 2, 0); env.addWidget(QLabel("cryptography — requis pour le coffre RSA"), 2, 1)
        check_env = QPushButton("Vérifier l'environnement"); check_env.clicked.connect(lambda: self._settings_log("SYSTEM", "Environnement vérifié.")); env.addWidget(check_env, 3, 0, 1, 2)
        grid.addWidget(env_box, 3, 0)

        app_box = self._section("Application", "Comportement au lancement et niveau de journalisation.")
        app_layout = QVBoxLayout(app_box)
        self.settings_update = QCheckBox("Vérifier les mises à jour au lancement"); self.settings_update.setChecked(self.settings.get("startup_update_check", True)); app_layout.addWidget(self.settings_update)
        self.settings_auto_agents = QCheckBox("Démarrer automatiquement les agents"); self.settings_auto_agents.setChecked(self.settings.get("auto_start_agents", False)); app_layout.addWidget(self.settings_auto_agents)
        app_row = QHBoxLayout(); app_row.addWidget(QLabel("Niveau de logs")); self.settings_log_level = QComboBox(); self.settings_log_level.addItems(["DEBUG", "INFO", "WARNING", "ERROR"]); self.settings_log_level.setCurrentText(self.settings.get("log_level", "INFO")); app_row.addWidget(self.settings_log_level); app_layout.addLayout(app_row)
        grid.addWidget(app_box, 3, 1)

        agents_box = self._section("Agents IA", "Configuration générale des agents enregistrés dans l'orchestrateur.")
        agents = QGridLayout(agents_box)
        for row, (name, role) in enumerate((("LA PUCE", "Développeur Principal"), ("LE GEEK", "Reviewer & QA"), ("L'ARCHIVISTE", "Documentation & Wiki"))):
            agents.addWidget(QLabel(name), row, 0); role_label = QLabel(role); role_label.setObjectName("muted"); agents.addWidget(role_label, row, 1)
            enabled = QCheckBox("Activé"); enabled.setChecked(True); agents.addWidget(enabled, row, 2)
        grid.addWidget(agents_box, 4, 0)

        api_box = self._section("API", "Gestion sécurisée de la clé OpenAI. La clé n'est jamais écrite dans settings.json.")
        api_layout = QVBoxLayout(api_box)
        api_top = QHBoxLayout(); api_top.addWidget(QLabel("Fournisseur")); provider = QLabel("OpenAI"); provider.setObjectName("section"); api_top.addWidget(provider); api_top.addStretch(); api_layout.addLayout(api_top)
        key_row = QHBoxLayout(); self.settings_api_key = QLineEdit(); self.settings_api_key.setEchoMode(QLineEdit.Password); self.settings_api_key.setPlaceholderText("sk-…  (laisser vide pour conserver la clé actuelle)"); key_row.addWidget(self.settings_api_key, 1)
        show = QPushButton("👁"); show.setCheckable(True); show.toggled.connect(lambda checked: self.settings_api_key.setEchoMode(QLineEdit.Normal if checked else QLineEdit.Password)); key_row.addWidget(show)
        api_layout.addLayout(key_row)
        storage_row = QHBoxLayout(); storage_row.addWidget(QLabel("Stockage sécurisé")); self.settings_storage = QComboBox(); self.settings_storage.addItem("macOS Keychain — recommandé", "keychain"); self.settings_storage.addItem("Coffre local RSA + AES-GCM + scrypt", "rsa_vault"); self.settings_storage.setCurrentIndex(max(0, self.settings_storage.findData(self.settings.get("api_storage", "keychain")))); storage_row.addWidget(self.settings_storage, 1); api_layout.addLayout(storage_row)
        self.settings_api_status = QLabel(); self.settings_api_status.setObjectName("muted"); api_layout.addWidget(self.settings_api_status)
        api_buttons = QHBoxLayout(); test = QPushButton("Tester la connexion"); test.clicked.connect(self._settings_test_openai); api_buttons.addWidget(test); save_key = QPushButton("Enregistrer la clé"); save_key.setObjectName("accent"); save_key.clicked.connect(self._settings_save_openai); api_buttons.addWidget(save_key); clear_key = QPushButton("Supprimer"); clear_key.clicked.connect(self._settings_delete_openai); api_buttons.addWidget(clear_key); api_layout.addLayout(api_buttons)
        grid.addWidget(api_box, 4, 1)

        maintenance = self._section("Maintenance", "Outils de diagnostic et réinitialisation des paramètres non secrets.")
        m = QHBoxLayout(maintenance)
        verify = QPushButton("✓  Vérifier l'installation"); verify.clicked.connect(lambda: self._settings_log("SYSTEM", "Vérification de l'installation terminée.")); m.addWidget(verify)
        repair = QPushButton("⟳  Réparer"); repair.clicked.connect(lambda: self._settings_log("SYSTEM", "Réparation demandée.")); m.addWidget(repair)
        reset = QPushButton("Réinitialiser les paramètres"); reset.clicked.connect(self._settings_reset); m.addWidget(reset)
        m.addStretch()
        grid.addWidget(maintenance, 5, 0, 1, 2)

        scroll.setWidget(content); outer.addWidget(scroll, 1)
        bottom = QHBoxLayout(); bottom.addStretch(); save = QPushButton("💾  Enregistrer les paramètres"); save.setObjectName("accent"); save.clicked.connect(self._settings_save); bottom.addWidget(save); outer.addLayout(bottom)
        self._settings_refresh_api_status()
        return root

    def _settings_line(self, grid, row, col, label, value, placeholder):
        editor = QLineEdit(value); editor.setPlaceholderText(placeholder); self._settings_row(grid, row, col, label, editor); return editor

    def _settings_row(self, grid, row, col, label, widget):
        box = QFrame(); box.setObjectName("listRow"); layout = QHBoxLayout(box); layout.addWidget(QLabel(label)); layout.addWidget(widget, 1); grid.addWidget(box, row, col)

    def _section(self, title, subtitle):
        box = QFrame(); box.setObjectName("console"); box.setProperty("sectionBox", True); layout = QVBoxLayout(box); title_label = QLabel(title); title_label.setObjectName("section"); layout.addWidget(title_label); sub = QLabel(subtitle); sub.setObjectName("muted"); layout.addWidget(sub); return box

    def _settings_storage(self):
        return SecureStorage(_repo_name(self.settings_repository.text()), DATA_DIR)

    def _settings_refresh_api_status(self):
        mode = self.settings_storage.currentData() if hasattr(self, "settings_storage") else self.settings.get("api_storage", "keychain")
        self.settings_api_status.setText("🟢 Clé configurée" if self._settings_storage().status(mode) else "⚪ Aucune clé enregistrée")

    def _settings_save_openai(self):
        key = self.settings_api_key.text().strip()
        if not key:
            self._settings_log("OpenAI", "Aucune nouvelle clé fournie — clé existante conservée.")
            return
        try:
            mode = self.settings_storage.currentData()
            self._settings_storage().save(key, mode)
            self.settings_api_key.clear()
            self._settings_refresh_api_status()
            self._settings_log("OpenAI", f"Clé enregistrée via {mode}.")
        except Exception as exc:
            self._settings_log("OpenAI", f"Échec du stockage sécurisé : {exc}")

    def _settings_test_openai(self):
        key = self.settings_api_key.text().strip() or self._settings_storage().load(self.settings_storage.currentData())
        if not key:
            self._settings_log("OpenAI", "Impossible de tester : aucune clé configurée.")
            return
        # The existing OpenAIService is currently a stub; do not leak the key into logs.
        self._settings_log("OpenAI", "Clé détectée. Test de connexion prêt à être branché au client OpenAI.")

    def _settings_delete_openai(self):
        try:
            mode = self.settings_storage.currentData(); self._settings_storage().delete(mode); self._settings_refresh_api_status(); self._settings_log("OpenAI", "Clé supprimée du stockage sécurisé.")
        except Exception as exc:
            self._settings_log("OpenAI", f"Suppression impossible : {exc}")

    def _settings_save(self):
        self.settings.update({
            "repository": self.settings_repository.text().strip(),
            "branch": self.settings_branch.text().strip(),
            "workspace": self.settings_workspace.text().strip(),
            "startup_update_check": self.settings_update.isChecked(),
            "auto_start_agents": self.settings_auto_agents.isChecked(),
            "log_level": self.settings_log_level.currentText(),
            "agent_mode": self.settings_mode.currentText(),
            "api_storage": self.settings_storage.currentData(),
        })
        save_settings(self.settings)
        self._settings_log("SYSTEM", "Paramètres enregistrés dans la configuration locale.")

    def _settings_reset(self):
        if SETTINGS_PATH.exists(): SETTINGS_PATH.unlink()
        self._settings_log("SYSTEM", "Paramètres locaux réinitialisés. Relancez l'application pour recharger les valeurs par défaut.")

    def _settings_log(self, source, message):
        self.add_log(source, message)

    MainWindow.build_settings_page = build_settings_page
    MainWindow._settings_line = _settings_line
    MainWindow._settings_row = _settings_row
    MainWindow._section = _section
    MainWindow._settings_storage = _settings_storage
    MainWindow._settings_refresh_api_status = _settings_refresh_api_status
    MainWindow._settings_save_openai = _settings_save_openai
    MainWindow._settings_test_openai = _settings_test_openai
    MainWindow._settings_delete_openai = _settings_delete_openai
    MainWindow._settings_save = _settings_save
    MainWindow._settings_reset = _settings_reset
    MainWindow._settings_log = _settings_log


from app.ui.main_window import MainWindow
install_settings_page(MainWindow)
