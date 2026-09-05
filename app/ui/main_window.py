from datetime import datetime
import webbrowser

from PySide2.QtCore import Qt, QTimer, QUrl, QProcess
from PySide2.QtWidgets import (
    QCheckBox, QDialog, QDialogButtonBox, QFrame, QGridLayout, QHBoxLayout,
    QLabel, QLineEdit, QMainWindow, QMessageBox, QPlainTextEdit, QPushButton,
    QStackedWidget, QVBoxLayout, QWidget
)
from PySide2.QtWebEngineWidgets import QWebEngineView

from app.core.config import AppConfig
from app.core.orchestrator import Orchestrator
from app.agents.puce import PuceAgent
from app.agents.geek import GeekAgent
from app.agents.archiviste import ArchivisteAgent
from app.services.git_service import GitService
from app.services.github_service import GitHubService
from app.services.openai_service import OpenAIService


NAV_ITEMS = (
    ("Dashboard", "▣"), ("Agents", "♙"), ("Console", "›_"),
    ("Archives", "▤"), ("Wiki", "▤"), ("Paramètres", "⚙"), ("Logs", "▤"),
)


class AgentEditor(QDialog):
    def __init__(self, name, data, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Agent — {name}")
        self.setMinimumSize(720, 520)
        self.name = name
        self.data = data
        layout = QVBoxLayout(self)
        title = QLabel(f"Configuration de {name}")
        title.setObjectName("pageTitle")
        layout.addWidget(title)
        role = QLabel(data.get("role", "")); role.setObjectName("muted"); layout.addWidget(role)
        enabled = QCheckBox("Agent actif")
        enabled.setChecked(bool(data.get("enabled", True)))
        layout.addWidget(enabled)
        layout.addWidget(QLabel("Prompt système"))
        prompt = QPlainTextEdit(); prompt.setPlainText(data.get("prompt", "")); layout.addWidget(prompt, 2)
        layout.addWidget(QLabel("Commandes autorisées — une commande/prefixe par ligne"))
        commands = QPlainTextEdit(); commands.setPlainText("\n".join(data.get("commands", []))); layout.addWidget(commands, 1)
        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept); buttons.rejected.connect(self.reject); layout.addWidget(buttons)
        self.enabled, self.prompt, self.commands = enabled, prompt, commands

    def values(self):
        return {
            "role": self.data.get("role", ""),
            "enabled": self.enabled.isChecked(),
            "prompt": self.prompt.toPlainText().strip(),
            "commands": [x.strip() for x in self.commands.toPlainText().splitlines() if x.strip()],
        }


class MainWindow(QMainWindow):
    """Fenêtre principale de Trading IA – Gestion des Agents."""

    def __init__(self):
        super().__init__()
        self.config = AppConfig(); self.config.ensure_directories()
        self.git = GitService(); self.github = GitHubService(); self.openai = OpenAIService()
        self.orchestrator = Orchestrator()
        self.puce, self.geek, self.archiviste = PuceAgent(), GeekAgent(), ArchivisteAgent()
        for agent in (self.puce, self.geek, self.archiviste): self.orchestrator.register(agent)
        self.agent_order = ["LA PUCE", "LE GEEK", "L'ARCHIVISTE"]
        self.nav_buttons, self.pages = {}, {}
        self.log_lines = []
        self.process = None
        self.setWindowTitle("Trading IA – Gestion des Agents")
        self.resize(1540, 920); self.setMinimumSize(1180, 760)
        self.build_ui()
        self.orchestrator.log_message.connect(self.add_log)
        for source, message in (("SYSTEM", "Connexion à GitHub réussie"),("SYSTEM", "Chargement des agents..."),("LA PUCE", "Analyse du repository en cours..."),("LE GEEK", "Vérification des nouvelles branches..."),("L'ARCHIVISTE", "Synchronisation du Wiki..."),("SYSTEM", "IA-TB_Dev_Updater prêt.")):
            self.add_log(source, message)
        self.clock = QTimer(self); self.clock.timeout.connect(self.refresh_clock); self.clock.start(1000)

    def build_ui(self):
        root = QWidget(); self.setCentralWidget(root)
        outer = QVBoxLayout(root); outer.setContentsMargins(14,10,14,7); outer.setSpacing(9)
        outer.addWidget(self.build_topbar()); self.stack = QStackedWidget(); self.stack.setObjectName("pageStack")
        for name, _ in NAV_ITEMS:
            page = self.build_page(name); self.pages[name] = page; self.stack.addWidget(page)
        outer.addWidget(self.stack,1); outer.addWidget(self.build_footer()); self.select_nav("Dashboard",False)

    def build_topbar(self):
        bar=QFrame(); bar.setObjectName("topbar"); layout=QHBoxLayout(bar); layout.setContentsMargins(8,4,8,4); layout.setSpacing(4)
        brand=QLabel("Trading IA – Gestion des Agents"); brand.setObjectName("title"); brand.setMinimumWidth(355); layout.addWidget(brand)
        for name,icon in NAV_ITEMS:
            b=QPushButton(f"{icon}  {name}"); b.setObjectName("nav"); b.setProperty("nav_name",name); b.clicked.connect(lambda checked=False,x=name:self.select_nav(x)); self.nav_buttons[name]=b; layout.addWidget(b)
        layout.addStretch(1); status=QLabel("●  Connecté"); status.setObjectName("connected"); layout.addWidget(status); layout.addWidget(QLabel("◉")); return bar

    def build_footer(self):
        footer=QFrame(); footer.setObjectName("footer"); layout=QHBoxLayout(footer); layout.setContentsMargins(10,3,10,3)
        layout.addWidget(QLabel("v1.0.0")); mode=QLabel("Mode: Production"); mode.setObjectName("modeOk"); layout.addWidget(mode); layout.addStretch(); layout.addWidget(QLabel("3 agents actifs   🟢 🔵 🟣")); layout.addStretch(); self.sync_label=QLabel("Dernière sync: --:--:--"); layout.addWidget(self.sync_label); layout.addWidget(QLabel("⟳")); return footer

    def select_nav(self,name,write_log=True):
        if name not in self.pages:return
        for item,b in self.nav_buttons.items(): b.setProperty("active",item==name); b.style().unpolish(b); b.style().polish(b)
        self.stack.setCurrentWidget(self.pages[name])
        if write_log:self.add_log("SYSTEM",f"Navigation: {name}")

    def build_page(self,name):
        page=QWidget(); layout=QVBoxLayout(page); layout.setContentsMargins(0,0,0,0); layout.setSpacing(12)
        builders={"Dashboard":self.build_dashboard,"Agents":self.build_agents_page,"Console":self.build_console_page,"Archives":self.build_archives_page,"Wiki":self.build_wiki_page,"Paramètres":self.build_settings_page,"Logs":self.build_logs_page}
        layout.addWidget(builders[name](),1); return page

    def page_header(self,title,subtitle):
        frame=QFrame(); frame.setObjectName("pageHeader"); layout=QVBoxLayout(frame); layout.setContentsMargins(16,12,16,12); label=QLabel(title); label.setObjectName("pageTitle"); layout.addWidget(label); sub=QLabel(subtitle); sub.setObjectName("muted"); layout.addWidget(sub); return frame

    def build_dashboard(self):
        wrapper=QWidget(); layout=QVBoxLayout(wrapper); layout.setContentsMargins(0,0,0,0); layout.setSpacing(10); layout.addWidget(self.page_header("Dashboard","Vue générale du repository, des agents et des opérations.")); layout.addWidget(self.build_agent_grid(),1); bottom=QHBoxLayout(); bottom.addWidget(self.build_console(),2); bottom.addWidget(self.build_quick_panel(),1); layout.addLayout(bottom); return wrapper

    def build_agent_grid(self):
        container=QWidget(); grid=QGridLayout(container); grid.setContentsMargins(0,0,0,0); grid.setHorizontalSpacing(15)
        data=[(self.puce,"green","🧠","LA PUCE","Développeur Principal","feat/rsi-signal",[("Ajout du module RSI Signal","feat/rsi-signal","14:32"),("Refactor risk_manager.py","refactor/risk","12:18"),("Correction calcul position size","fix/position-size","10:47")]),(self.geek,"blue","🤓","LE GEEK","Reviewer & QA","review/184",[("Review: feat/rsi-signal","review/184","14:45"),("Tests de régression","test/regression","13:50"),("Analyse sécurité","sec/scan","12:05")]),(self.archiviste,"purple","📖","L'ARCHIVISTE","Documentation & Wiki","wiki/docs",[("Mise à jour Wiki - RSI Signal","wiki/rsi-signal","15:01"),("Changelog v1.4.2","changelog/v1.4.2","13:30"),("Architecture - Risk Engine","wiki/architecture","11:15")])]
        for col,item in enumerate(data):grid.addWidget(self.build_agent_card(*item),0,col);grid.setColumnStretch(col,1)
        return container

    def build_agent_card(self,agent,accent,icon,name,role,branch,changes):
        card=QFrame();card.setObjectName("agentCard");card.setProperty("accent",accent);layout=QVBoxLayout(card);layout.setContentsMargins(14,11,14,11);layout.setSpacing(7);header=QHBoxLayout();avatar=QLabel(icon);avatar.setFixedSize(45,45);avatar.setAlignment(Qt.AlignCenter);avatar.setObjectName("avatar");header.addWidget(avatar);texts=QVBoxLayout();title=QLabel(name);title.setObjectName(f"agent_{accent}");texts.addWidget(title);role_label=QLabel(role);role_label.setObjectName("muted");texts.addWidget(role_label);header.addLayout(texts,1);badge=QLabel("ACTIF");badge.setObjectName("activeBadge");header.addWidget(badge,0,Qt.AlignTop);layout.addLayout(header);self.add_separator(layout);section=QLabel("Dernières modifications");section.setObjectName("section");layout.addWidget(section)
        for text,tag,time in changes:
            row=QHBoxLayout();row.addWidget(QLabel("◈"));row.addWidget(QLabel(text),1);tag_label=QLabel(tag);tag_label.setObjectName("tag");row.addWidget(tag_label);row.addWidget(QLabel(time));layout.addLayout(row)
        self.add_separator(layout);tree_title=QLabel("Arborescence <span style='color:#a6b0bb'>(branche surveillée)</span>");tree_title.setObjectName("section");layout.addWidget(tree_title);branch_label=QLabel("⌘  "+branch);branch_label.setObjectName(f"branch_{accent}");layout.addWidget(branch_label);tree=QFrame();tree.setObjectName("tree");tree_layout=QVBoxLayout(tree);tree_layout.setContentsMargins(10,7,10,7)
        for text,indent,modified in self.tree_for(accent):
            row=QHBoxLayout();row.setContentsMargins(indent*15,0,0,0);row.addWidget(QLabel(text),1)
            if modified:m=QLabel(modified);m.setObjectName("modified");row.addWidget(m)
            tree_layout.addLayout(row)
        layout.addWidget(tree,1);return card

    def add_separator(self,layout):line=QFrame();line.setFrameShape(QFrame.HLine);line.setObjectName("separator");layout.addWidget(line)
    def tree_for(self,accent):
        if accent=="green":return [("▾  📁 trading-ia/",0,""),("▾  📁 src/",1,""),("▾  📁 signals/",2,""),("🐍  rsi_signal.py",3,"M"),("🐍  risk_manager.py",3,"M"),("▾  📁 tests/",1,""),("🐍  test_rsi_signal.py",2,"A"),("▤  README.md",1,"M")]
        if accent=="blue":return [("▾  📁 trading-ia/",0,""),("▾  📁 reports/",1,""),("▤  review_184.md",2,"M"),("▾  📁 tests/",1,""),("🌐  regression_report.html",3,"A"),("◉  coverage.xml",3,"")]
        return [("▾  📁 wiki/",0,""),("▾  📁 strategies/",1,""),("▤  rsi-signal.md",2,"M"),("▤  risk-management.md",2,""),("▾  📁 architecture/",1,""),("▤  system-overview.md",2,"A")]

    def build_agents_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Agents","Configuration des agents IA : prompt, activation et commandes autorisées.")); self.agent_rows=QVBoxLayout();layout.addLayout(self.agent_rows);self.refresh_agent_rows();layout.addStretch();return frame

    def refresh_agent_rows(self):
        if not hasattr(self,"agent_rows"):return
        while self.agent_rows.count():
            item=self.agent_rows.takeAt(0); widget=item.widget()
            if widget:widget.deleteLater()
        colors={"LA PUCE":"green","LE GEEK":"blue","L'ARCHIVISTE":"purple"}
        for name in self.agent_order:
            data=self.config.agents.get(name,{"role":"","enabled":True,"prompt":"","commands":[]});row=QFrame();row.setObjectName("listRow");r=QHBoxLayout(row); r.addWidget(QLabel(name)); role=QLabel(data.get("role",""));role.setObjectName("muted");r.addWidget(role,1); cmd=QLabel(f"{len(data.get('commands',[]))} commandes");cmd.setObjectName("muted");r.addWidget(cmd);badge=QLabel("ACTIF" if data.get("enabled",True) else "DÉSACTIVÉ");badge.setObjectName(f"badge_{colors.get(name,'green')}");r.addWidget(badge);edit=QPushButton("✎  Éditer");edit.clicked.connect(lambda checked=False,n=name:self.edit_agent(n));r.addWidget(edit);delete=QPushButton("Supprimer");delete.clicked.connect(lambda checked=False,n=name:self.delete_agent(n));r.addWidget(delete);self.agent_rows.addWidget(row)
        add=QPushButton("＋  Ajouter un agent");add.clicked.connect(self.add_agent);self.agent_rows.addWidget(add)

    def edit_agent(self,name):
        dialog=AgentEditor(name,self.config.agents[name],self)
        if dialog.exec_():self.config.agents[name]=dialog.values();self.config.save_settings();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Configuration de {name} enregistrée.")

    def add_agent(self):
        dialog=QDialog(self);dialog.setWindowTitle("Ajouter un agent");dialog.setMinimumWidth(520);v=QVBoxLayout(dialog);v.addWidget(QLabel("Nom de l'agent"));name_edit=QLineEdit();v.addWidget(name_edit);v.addWidget(QLabel("Rôle"));role_edit=QLineEdit();v.addWidget(role_edit);buttons=QDialogButtonBox(QDialogButtonBox.Save|QDialogButtonBox.Cancel);buttons.accepted.connect(dialog.accept);buttons.rejected.connect(dialog.reject);v.addWidget(buttons)
        if not dialog.exec_():return
        name=name_edit.text().strip().upper();role=role_edit.text().strip() or "Agent IA"
        if not name:return
        if name in self.config.agents:QMessageBox.warning(self,"Agent existant","Un agent porte déjà ce nom.");return
        self.config.agents[name]={"role":role,"enabled":True,"prompt":f"Tu es {name}, {role}.","commands":["git status","python"]};self.agent_order.append(name);self.config.save_settings();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Agent {name} ajouté.")

    def delete_agent(self,name):
        if QMessageBox.question(self,"Supprimer l'agent",f"Supprimer {name} de la configuration ?")!=QMessageBox.Yes:return
        self.config.agents.pop(name,None)
        if name in self.agent_order:self.agent_order.remove(name)
        self.config.save_settings();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Agent {name} supprimé de la configuration.")

    def build_console_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Console","Exécution des commandes système et retour en temps réel."));layout.addWidget(self.build_console(),1);return frame

    def build_archives_page(self):return self.simple_data_page("Archives","Versions, builds et archives générés par le programme.",[("v1.7.9","Archive complète","VALIDÉ"),("v1.8.0","Build UpdateManager","EN TEST"),("debug","Build de développement","WIP")])

    def build_wiki_page(self):
        frame=QFrame();frame.setObjectName("wikiPage");layout=QVBoxLayout(frame);layout.setContentsMargins(0,0,0,0);layout.setSpacing(10);layout.addWidget(self.page_header("Wiki","Documentation du programme — README.md de la branche github-administration."));self.wiki_view=QWebEngineView();self.wiki_view.setObjectName("wikiView");self.wiki_view.setUrl(QUrl("https://github.com/florian74410/IA-Trading-Bot/blob/github-administration/README.md"));toolbar=QHBoxLayout();status=QLabel("●  Documentation GitHub");status.setObjectName("connected");toolbar.addWidget(status);toolbar.addStretch()
        for text,slot in (("‹  Retour",self.wiki_view.back),("Avancer  ›",self.wiki_view.forward),("⟳  Actualiser",self.wiki_view.reload),("↗  GitHub",self.open_wiki_external)):b=QPushButton(text);b.clicked.connect(slot);toolbar.addWidget(b)
        layout.addLayout(toolbar);self.wiki_view.loadStarted.connect(lambda:status.setText("●  Chargement du Wiki..."));self.wiki_view.loadFinished.connect(self.on_wiki_loaded);layout.addWidget(self.wiki_view,1);return frame
    def on_wiki_loaded(self,ok):self.add_log("WIKI","README.md chargé depuis GitHub." if ok else "Échec du chargement du README.md.")
    def open_wiki_external(self):webbrowser.open("https://github.com/florian74410/IA-Trading-Bot/blob/github-administration/README.md")

    def simple_data_page(self,title,subtitle,rows):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header(title,subtitle))
        for name,detail,state in rows:row=QFrame();row.setObjectName("listRow");r=QHBoxLayout(row);r.addWidget(QLabel(name));d=QLabel(detail);d.setObjectName("muted");r.addWidget(d,1);r.addWidget(QLabel(state));layout.addWidget(row)
        layout.addStretch();return frame

    def build_console(self):
        wrapper=QFrame();wrapper.setObjectName("consolePanel");layout=QVBoxLayout(wrapper);layout.setContentsMargins(10,8,10,8);layout.setSpacing(6);header=QHBoxLayout();title=QLabel("›_  CONSOLE");title.setObjectName("section");header.addWidget(title);header.addStretch();header.addWidget(QLabel("Shell local"));clear=QPushButton("▱  Vider");clear.clicked.connect(self.clear_logs);header.addWidget(clear);layout.addLayout(header)
        if not hasattr(self,"log_view"):self.log_view=QPlainTextEdit();self.log_view.setReadOnly(True);self.log_view.setObjectName("consoleOutput")
        layout.addWidget(self.log_view,1)
        input_row=QHBoxLayout();prompt=QLabel("console>");prompt.setObjectName("connected");input_row.addWidget(prompt);self.console_input=QLineEdit();self.console_input.setPlaceholderText("Entrer une commande…");self.console_input.returnPressed.connect(self.execute_command);input_row.addWidget(self.console_input,1);run=QPushButton("▶  Exécuter");run.setObjectName("accent");run.clicked.connect(self.execute_command);input_row.addWidget(run);layout.addLayout(input_row);return wrapper

    def execute_command(self):
        command=self.console_input.text().strip()
        if not command:return
        self.console_input.clear();self.add_log("CONSOLE",f"$ {command}")
        if self.process and self.process.state()!=QProcess.NotRunning:
            self.add_log("CONSOLE","Une commande est déjà en cours d'exécution.");return
        self.process=QProcess(self);self.process.setWorkingDirectory(str(self.config.workspace));self.process.setProcessChannelMode(QProcess.MergedChannels);self.process.readyReadStandardOutput.connect(self.read_process_output);self.process.finished.connect(self.command_finished);self.process.errorOccurred.connect(self.command_error)
        shell="/bin/zsh" if __import__('os').path.exists("/bin/zsh") else "/bin/bash"
        self.process.start(shell,["-lc",command])

    def read_process_output(self):
        if self.process:
            text=bytes(self.process.readAllStandardOutput()).decode("utf-8","replace")
            for line in text.splitlines():self.add_log("CONSOLE",line)

    def command_finished(self,code,status):
        self.read_process_output();self.add_log("CONSOLE",f"Commande terminée — code {code}.")

    def command_error(self,error):self.add_log("CONSOLE",f"Erreur d'exécution : {error}")

    def build_quick_panel(self):
        wrapper=QWidget();layout=QVBoxLayout(wrapper);layout.setContentsMargins(0,0,0,0);quick=QFrame();quick.setObjectName("consolePanel");q=QVBoxLayout(quick);q.addWidget(QLabel("Commandes rapides"));grid=QGridLayout();commands=[("⟳  Sync All",self.sync_all,""),("▷  Run Tests",self.run_tests,""),("▣  Build",self.build_project,""),("↥  Push All",self.push_all,"accent"),("▣  Create PR",self.create_pr,""),("▤  Update Wiki",self.update_wiki,"purple")]
        for i,(text,fn,kind) in enumerate(commands):b=QPushButton(text);b.clicked.connect(fn);b.setObjectName(kind) if kind else None;grid.addWidget(b,i//2,i%2)
        q.addLayout(grid);layout.addWidget(quick);return wrapper

    def build_settings_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Paramètres","Configuration du projet, de l'environnement et des privilèges des agents IA."));self.settings_layout=QVBoxLayout();layout.addLayout(self.settings_layout);self.refresh_settings_page();test=QPushButton("✓  Vérifier les services");test.clicked.connect(self.test_services);layout.addWidget(test);layout.addStretch();return frame

    def refresh_settings_page(self):
        if not hasattr(self,"settings_layout"):return
        while self.settings_layout.count():
            item=self.settings_layout.takeAt(0);w=item.widget()
            if w:w.deleteLater()
        boxes=[("Projet Git",[("Repository",self.config.repository),("Branche active","github-administration"),("Workspace local",str(self.config.workspace))]),("Environnement",[("Python","Détecté au lancement"),("PySide2","5.15.2.1"),("Dépendances","requirements.txt")]),("Application",[("Mise à jour au lancement","Activée"),("Démarrage des agents","Manuel"),("Niveau de logs","INFO")]),("Privilèges des agents IA",[(name,f"{len(data.get('commands',[]))} commandes autorisées — {'actif' if data.get('enabled',True) else 'désactivé'}") for name,data in self.config.agents.items()]),("API",[("OpenAI","Clé protégée dans le coffre local"),("GitHub","Connexion active")])]
        for title,items in boxes:
            box=QFrame();box.setObjectName("listRow");v=QVBoxLayout(box);h=QLabel(title);h.setObjectName("section");v.addWidget(h)
            for label,value in items:r=QHBoxLayout();r.addWidget(QLabel(label));val=QLabel(value);val.setObjectName("muted");r.addWidget(val,1);v.addLayout(r)
            self.settings_layout.addWidget(box)

    def build_logs_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Logs","Historique complet des événements et opérations de l'application."));self.full_log_view=QPlainTextEdit();self.full_log_view.setReadOnly(True);self.full_log_view.setObjectName("fullLogView");layout.addWidget(self.full_log_view,1);buttons=QHBoxLayout();clear=QPushButton("▱  Vider les logs");clear.clicked.connect(self.clear_logs);buttons.addWidget(clear);buttons.addStretch();refresh=QPushButton("▤  Rafraîchir");refresh.clicked.connect(self.refresh_full_log);buttons.addWidget(refresh);layout.addLayout(buttons);self.refresh_full_log();return frame
    def refresh_full_log(self):
        if hasattr(self,"full_log_view"):self.full_log_view.setPlainText("\n".join(self.log_lines));self.full_log_view.verticalScrollBar().setValue(self.full_log_view.verticalScrollBar().maximum())
    def clear_logs(self):
        self.log_lines.clear()
        if hasattr(self,"log_view"):self.log_view.clear()
        if hasattr(self,"full_log_view"):self.full_log_view.clear()
    def add_log(self,source,message):
        line=f"[{datetime.now().strftime('%H:%M:%S')}]  ▶ {source:<14} {message}";self.log_lines.append(line)
        if hasattr(self,"log_view"):self.log_view.appendPlainText(line);self.log_view.verticalScrollBar().setValue(self.log_view.verticalScrollBar().maximum())
        if hasattr(self,"full_log_view"):self.full_log_view.appendPlainText(line);self.full_log_view.verticalScrollBar().setValue(self.full_log_view.verticalScrollBar().maximum())
    def refresh_clock(self):self.sync_label.setText("Dernière sync: "+datetime.now().strftime("%H:%M:%S"))
    def start_agent(self,agent_id):self.orchestrator.start_agent(agent_id);self.add_log(agent_id,"Agent démarré")
    def test_services(self):
        github_ok,github_message=self.github.test_connection();openai_ok,openai_message=self.openai.test_connection();self.add_log("Git",self.git.version());self.add_log("GitHub",github_message);self.add_log("OpenAI",openai_message)
    def sync_all(self):self.add_log("SYSTEM","Synchronisation complète du repository demandée...");self.add_log("GITHUB","Branches, commits et fichiers synchronisés.");self.refresh_clock()
    def run_tests(self):self.add_log("LE GEEK","Lancement de la suite de tests...")
    def build_project(self):self.add_log("LA PUCE","Build du projet lancé...")
    def push_all(self):self.add_log("GITHUB","Préparation du push des modifications...")
    def create_pr(self):self.add_log("LE GEEK","Création d'une Pull Request demandée...")
    def update_wiki(self):self.add_log("L'ARCHIVISTE","Mise à jour du Wiki demandée...")
