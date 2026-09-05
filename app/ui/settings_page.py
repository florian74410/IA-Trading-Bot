import json
import platform
import sys
from pathlib import Path

from PySide2.QtCore import Qt
from PySide2.QtWidgets import (
    QCheckBox, QComboBox, QDialog, QDialogButtonBox, QFrame, QGridLayout,
    QHBoxLayout, QLabel, QLineEdit, QPlainTextEdit, QPushButton, QScrollArea,
    QTabWidget, QVBoxLayout, QWidget
)

from app.core.config import DATA_DIR, DEFAULT_AGENTS

SETTINGS_PATH = DATA_DIR / "settings.json"


def load_settings():
    try:
        return json.loads(SETTINGS_PATH.read_text(encoding="utf-8")) if SETTINGS_PATH.exists() else {}
    except (OSError, ValueError, TypeError):
        return {}


def save_settings(data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SETTINGS_PATH)


def _default_agent(name):
    return json.loads(json.dumps(DEFAULT_AGENTS.get(name, {
        "pseudo": name, "role": "Agent IA", "avatar": "🤖", "accent": "green", "enabled": True,
        "mission": "Définir la mission principale de cet agent.", "objectives": "", "methodology": "Analyser → planifier → exécuter → vérifier.",
        "prompt": "", "context": "", "autonomy": "Proposition", "execution_mode": "À la demande", "commands": [],
        "forbidden": "Ne jamais exposer de secrets ni effectuer d'action destructive sans validation."
    })))


class AdvancedAgentDialog(QDialog):
    """Administrative, complete agent configuration editor."""
    def __init__(self, name, data, parent=None):
        super().__init__(parent)
        self.name = name
        self.data = dict(data)
        self.setWindowTitle(f"Paramétrage avancé — {name}")
        self.resize(980, 760)
        root = QVBoxLayout(self)
        title = QLabel(f"⚙  {data.get('avatar','🤖')} {data.get('pseudo', name)}")
        title.setObjectName("section"); root.addWidget(title)
        sub = QLabel("Configuration administrative complète. Les valeurs sont persistées dans settings.json et consommées par l'orchestrateur.")
        sub.setObjectName("muted"); sub.setWordWrap(True); root.addWidget(sub)
        tabs = QTabWidget(); root.addWidget(tabs, 1)

        identity = QWidget(); g = QGridLayout(identity)
        self.pseudo = self.line(g, 0, "Pseudo affiché", data.get("pseudo", name))
        self.role = self.line(g, 1, "Rôle", data.get("role", "Agent IA"))
        self.avatar = self.line(g, 2, "Avatar / icône", data.get("avatar", "🤖"))
        self.accent = QComboBox(); self.accent.addItems(["green", "blue", "purple", "orange"]); self.accent.setCurrentText(data.get("accent", "green")); g.addWidget(QLabel("Accent visuel"), 3, 0); g.addWidget(self.accent, 3, 1)
        self.enabled = QCheckBox("Agent activé"); self.enabled.setChecked(bool(data.get("enabled", True))); g.addWidget(self.enabled, 4, 0, 1, 2)
        tabs.addTab(identity, "Identité")

        mission = QWidget(); mv = QVBoxLayout(mission)
        self.mission = self.area(mv, "Mission principale", data.get("mission", ""), 80)
        self.objectives = self.area(mv, "Objectifs — un objectif par ligne", data.get("objectives", ""), 120)
        self.methodology = self.area(mv, "Méthodologie / workflow", data.get("methodology", ""), 100)
        tabs.addTab(mission, "Mission")

        intelligence = QWidget(); iv = QVBoxLayout(intelligence)
        self.prompt = self.area(iv, "Prompt système / instructions fondamentales", data.get("prompt", ""), 220)
        self.context = self.area(iv, "Contexte permanent / ressources accessibles", data.get("context", ""), 130)
        self.forbidden = self.area(iv, "Règles, interdictions et garde-fous", data.get("forbidden", ""), 130)
        tabs.addTab(intelligence, "Intelligence")

        execution = QWidget(); eg = QGridLayout(execution)
        self.autonomy = QComboBox(); self.autonomy.addItems(["Observation", "Proposition", "Exécution contrôlée", "Autonome"]); self.autonomy.setCurrentText(data.get("autonomy", "Proposition")); eg.addWidget(QLabel("Niveau d'autonomie"), 0, 0); eg.addWidget(self.autonomy, 0, 1)
        self.execution_mode = QComboBox(); self.execution_mode.addItems(["À la demande", "Après validation", "Automatique"]); self.execution_mode.setCurrentText(data.get("execution_mode", "À la demande")); eg.addWidget(QLabel("Mode d'exécution"), 1, 0); eg.addWidget(self.execution_mode, 1, 1)
        self.model = self.line(eg, 2, "Modèle IA", data.get("model", "gpt-4o-mini"))
        self.temperature = self.line(eg, 3, "Température", str(data.get("temperature", "0.2")))
        self.workspace = self.line(eg, 4, "Workspace", data.get("workspace", str(DATA_DIR / "workspace")))
        self.branch = self.line(eg, 5, "Branche de travail", data.get("branch", "github-administration"))
        self.trigger = self.line(eg, 6, "Déclencheur", data.get("trigger", "manual"))
        tabs.addTab(execution, "Exécution")

        privileges = QWidget(); pv = QVBoxLayout(privileges)
        pv.addWidget(QLabel("Commandes autorisées — une commande ou un préfixe par ligne"))
        self.commands = QPlainTextEdit(); self.commands.setPlainText("\n".join(data.get("commands", []))); pv.addWidget(self.commands, 2)
        checks = QGridLayout(); self.git_access = self.check(checks, 0, "git", "Accès Git", data.get("git_access", True)); self.github_access = self.check(checks, 0, "github", "Accès GitHub", data.get("github_access", False), 2); self.files_access = self.check(checks, 1, "files", "Accès fichiers", data.get("files_access", True)); self.terminal_access = self.check(checks, 1, "terminal", "Accès terminal", data.get("terminal_access", False), 2); self.sensitive = self.check(checks, 2, "sensitive", "Opérations sensibles", data.get("sensitive_operations", False)); self.network = self.check(checks, 2, "network", "Accès réseau", data.get("network_access", False), 2); pv.addLayout(checks)
        tabs.addTab(privileges, "Privilèges")

        memory = QWidget(); mg = QGridLayout(memory)
        self.memory_enabled = self.check(mg, 0, "memory", "Mémoire de travail activée", data.get("memory_enabled", True))
        self.history_enabled = self.check(mg, 1, "history", "Historique des actions", data.get("history_enabled", True))
        self.log_actions = self.check(mg, 2, "logs", "Journaliser les actions", data.get("log_actions", True))
        self.max_steps = self.line(mg, 3, "Étapes maximum / tâche", str(data.get("max_steps", "20")))
        self.resources = self.area_grid(mg, 4, "Ressources autorisées", data.get("resources", ""))
        tabs.addTab(memory, "Mémoire & Logs")

        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel); buttons.accepted.connect(self.accept); buttons.rejected.connect(self.reject); root.addWidget(buttons)

    def line(self, grid, row, label, value):
        grid.addWidget(QLabel(label), row, 0); e = QLineEdit(value); grid.addWidget(e, row, 1); return e
    def area(self, layout, label, value, height):
        layout.addWidget(QLabel(label)); e = QPlainTextEdit(); e.setPlainText(value); e.setMinimumHeight(height); layout.addWidget(e); return e
    def area_grid(self, grid, row, label, value):
        grid.addWidget(QLabel(label), row, 0); e = QPlainTextEdit(); e.setPlainText(value); e.setMinimumHeight(120); grid.addWidget(e, row, 1); return e
    def check(self, grid, row, key, label, checked, col=0):
        c = QCheckBox(label); c.setChecked(bool(checked)); grid.addWidget(c, row, col); return c
    def values(self):
        d = dict(self.data)
        d.update({
            "pseudo": self.pseudo.text().strip() or self.name, "role": self.role.text().strip() or "Agent IA", "avatar": self.avatar.text().strip() or "🤖", "accent": self.accent.currentText(), "enabled": self.enabled.isChecked(),
            "mission": self.mission.toPlainText().strip(), "objectives": self.objectives.toPlainText().strip(), "methodology": self.methodology.toPlainText().strip(), "prompt": self.prompt.toPlainText().strip(), "context": self.context.toPlainText().strip(), "forbidden": self.forbidden.toPlainText().strip(),
            "autonomy": self.autonomy.currentText(), "execution_mode": self.execution_mode.currentText(), "model": self.model.text().strip(), "temperature": self.temperature.text().strip(), "workspace": self.workspace.text().strip(), "branch": self.branch.text().strip(), "trigger": self.trigger.text().strip(),
            "commands": [x.strip() for x in self.commands.toPlainText().splitlines() if x.strip()], "git_access": self.git_access.isChecked(), "github_access": self.github_access.isChecked(), "files_access": self.files_access.isChecked(), "terminal_access": self.terminal_access.isChecked(), "sensitive_operations": self.sensitive.isChecked(), "network_access": self.network.isChecked(),
            "memory_enabled": self.memory_enabled.isChecked(), "history_enabled": self.history_enabled.isChecked(), "log_actions": self.log_actions.isChecked(), "max_steps": self.max_steps.text().strip(), "resources": self.resources.toPlainText().strip(),
        })
        return d


def install_settings_page(MainWindow):
    def build_settings_page(self):
        self.settings_page_data = load_settings()
        root = QFrame(); root.setObjectName("pageFrame"); outer = QVBoxLayout(root); outer.setSpacing(10)
        header = self.page_header("Paramètres", "Centre de configuration avancée : projet, environnement, sécurité et fiches techniques complètes des agents.")
        outer.addWidget(header)
        scroll = QScrollArea(); scroll.setWidgetResizable(True); scroll.setFrameShape(QFrame.NoFrame)
        content = QWidget(); v = QVBoxLayout(content); v.setSpacing(12)

        project = self.box("PROJET & ENVIRONNEMENT", "Paramètres généraux de l'application")
        pg = QGridLayout(project); self.s_repository = self.setting_line(pg, 0, "Repository", self.config.repository); self.s_branch = self.setting_line(pg, 1, "Branche", "github-administration"); self.s_workspace = self.setting_line(pg, 2, "Workspace", str(self.config.workspace)); pg.addWidget(QLabel(f"Python {sys.version.split()[0]}  •  {platform.system()} {platform.machine()}"), 3, 0, 1, 2); v.addWidget(project)

        agents = self.box("CONFIGURATION AVANCÉE DES AGENTS", "Chaque fiche regroupe identité, mission, prompt, autonomie, exécution, privilèges, mémoire et restrictions.")
        av = QVBoxLayout(agents); self.settings_agent_rows = QVBoxLayout(); av.addLayout(self.settings_agent_rows); v.addWidget(agents)
        self._render_agent_settings_rows()

        app = self.box("APPLICATION", "Comportement global et journalisation")
        ac = QHBoxLayout(app); self.s_update = QCheckBox("Vérifier les mises à jour au lancement"); self.s_update.setChecked(self.settings_page_data.get("startup_update_check", True)); ac.addWidget(self.s_update); self.s_auto = QCheckBox("Démarrer automatiquement les agents"); self.s_auto.setChecked(self.settings_page_data.get("auto_start_agents", False)); ac.addWidget(self.s_auto); ac.addWidget(QLabel("Logs")); self.s_log = QComboBox(); self.s_log.addItems(["DEBUG", "INFO", "WARNING", "ERROR"]); self.s_log.setCurrentText(self.settings_page_data.get("log_level", "INFO")); ac.addWidget(self.s_log); ac.addStretch(); v.addWidget(app)

        security = self.box("SÉCURITÉ", "Les secrets restent hors de la configuration des agents et ne doivent jamais apparaître dans les prompts ou logs.")
        sv = QVBoxLayout(security); sv.addWidget(QLabel("OpenAI : stockage sécurisé via le coffre existant. GitHub : utiliser le service connecté. Les privilèges ci-dessus limitent les actions des agents, pas la console humaine.")); v.addWidget(security)
        scroll.setWidget(content); outer.addWidget(scroll, 1)
        bottom = QHBoxLayout(); bottom.addWidget(QLabel("Les changements sont persistés localement et repris au prochain lancement.")); bottom.addStretch(); save = QPushButton("💾  Enregistrer la configuration"); save.setObjectName("accent"); save.clicked.connect(self._settings_save_all); bottom.addWidget(save); outer.addLayout(bottom)
        return root

    def box(self, title, subtitle):
        f = QFrame(); f.setObjectName("listRow"); l = QVBoxLayout(f); t = QLabel(title); t.setObjectName("section"); l.addWidget(t); s = QLabel(subtitle); s.setObjectName("muted"); l.addWidget(s); return f
    def setting_line(self, grid, row, label, value):
        grid.addWidget(QLabel(label), row, 0); e = QLineEdit(value); grid.addWidget(e, row, 1); return e
    def _render_agent_settings_rows(self):
        while self.settings_agent_rows.count():
            item = self.settings_agent_rows.takeAt(0); w = item.widget()
            if w: w.deleteLater()
        for name in self.agent_order:
            d = self.config.agents.get(name, _default_agent(name)); row = QFrame(); row.setObjectName("listRow"); r = QHBoxLayout(row)
            avatar = QLabel(d.get("avatar", "🤖")); avatar.setFixedWidth(36); avatar.setAlignment(Qt.AlignCenter); r.addWidget(avatar)
            info = QVBoxLayout(); title = QLabel(f"{d.get('pseudo', name)}  —  {d.get('role', 'Agent IA')}"); title.setObjectName("section"); info.addWidget(title); summary = QLabel(f"{'ACTIF' if d.get('enabled', True) else 'DÉSACTIVÉ'}  •  {d.get('autonomy', 'Proposition')}  •  {d.get('execution_mode', 'À la demande')}  •  {len(d.get('commands', []))} commandes  •  modèle: {d.get('model', 'gpt-4o-mini')}"); summary.setObjectName("muted"); info.addWidget(summary); r.addLayout(info, 1)
            edit = QPushButton("⚙  Configuration complète"); edit.setObjectName("blue"); edit.clicked.connect(lambda checked=False, n=name: self._configure_agent(n)); r.addWidget(edit)
            toggle = QPushButton("Désactiver" if d.get("enabled", True) else "Activer"); toggle.clicked.connect(lambda checked=False, n=name: self._toggle_agent(n)); r.addWidget(toggle); self.settings_agent_rows.addWidget(row)
        add = QPushButton("＋  Ajouter un nouvel agent"); add.clicked.connect(self.add_agent); self.settings_agent_rows.addWidget(add)

    def _configure_agent(self, name):
        dialog = AdvancedAgentDialog(name, self.config.agents.get(name, _default_agent(name)), self)
        if dialog.exec_():
            self.config.agents[name] = dialog.values(); self.config.save_settings(); self._render_agent_settings_rows(); self.refresh_agent_cards(); self.add_log("SYSTEM", f"Configuration avancée de {name} enregistrée.")

    def _toggle_agent(self, name):
        d = self.config.agents[name]; d["enabled"] = not d.get("enabled", True); self.config.save_settings(); self._render_agent_settings_rows(); self.refresh_agent_cards(); self.add_log("SYSTEM", f"Agent {name}: {'activé' if d['enabled'] else 'désactivé'}.")

    def _settings_save_all(self):
        self.config.repository = self.s_repository.text().strip() or self.config.repository
        self.config.workspace = Path(self.s_workspace.text().strip() or str(DATA_DIR / "workspace")); self.config.ensure_directories(); self.config.save_settings()
        data = dict(self.settings_page_data); data.update({"repository": self.s_repository.text().strip(), "branch": self.s_branch.text().strip(), "workspace": self.s_workspace.text().strip(), "startup_update_check": self.s_update.isChecked(), "auto_start_agents": self.s_auto.isChecked(), "log_level": self.s_log.currentText(), "agents": self.config.agents}); save_settings(data); self.add_log("SYSTEM", "Configuration générale et configuration des agents enregistrées.")

    MainWindow.build_settings_page = build_settings_page
    MainWindow.refresh_settings_page = lambda self: self._render_agent_settings_rows() if hasattr(self, "settings_agent_rows") else None
    MainWindow.box = box
    MainWindow.setting_line = setting_line
    MainWindow._render_agent_settings_rows = _render_agent_settings_rows
    MainWindow._configure_agent = _configure_agent
    MainWindow._toggle_agent = _toggle_agent
    MainWindow._settings_save_all = _settings_save_all


from app.ui.main_window import MainWindow
install_settings_page(MainWindow)
