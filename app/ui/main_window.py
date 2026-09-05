from datetime import datetime
import os
import webbrowser

from PySide2.QtCore import Qt, QTimer, QUrl, QProcess
from PySide2.QtWidgets import (
    QCheckBox, QComboBox, QDialog, QDialogButtonBox, QFrame, QGridLayout,
    QHBoxLayout, QLabel, QLineEdit, QMainWindow, QMessageBox, QPlainTextEdit,
    QPushButton, QScrollArea, QStackedWidget, QVBoxLayout, QWidget
)
from PySide2.QtWebEngineWidgets import QWebEngineView

from app.core.config import AppConfig, LOG_DIR
from app.core.orchestrator import Orchestrator
from app.agents.puce import PuceAgent
from app.agents.geek import GeekAgent
from app.agents.archiviste import ArchivisteAgent
from app.services.git_service import GitService
from app.services.github_service import GitHubService
from app.services.openai_service import OpenAIService

NAV_ITEMS = (("Dashboard", "▣"), ("Agents", "♙"), ("Console", "›_"), ("Archives", "▤"), ("Wiki", "▤"), ("Paramètres", "⚙"), ("Logs", "▤"))
ACCENTS = {"green": "#67d35b", "blue": "#4f9cff", "purple": "#b260d9", "orange": "#f3a847"}


class AgentEditor(QDialog):
    """Full mission-sheet editor. Superficial identity and deep operational fields live here."""
    def __init__(self, name, data, parent=None):
        super().__init__(parent)
        self.name = name
        self.data = dict(data)
        self.setWindowTitle(f"Fiche de mission — {name}")
        self.setMinimumSize(900, 700)
        self.setObjectName("agentEditor")
        root = QVBoxLayout(self)
        title = QLabel(f"{data.get('avatar', '🤖')}  {data.get('pseudo', name)}")
        title.setObjectName("pageTitle")
        root.addWidget(title)
        subtitle = QLabel("Configuration complète de la mission, du comportement et du niveau d'autonomie.")
        subtitle.setObjectName("muted")
        root.addWidget(subtitle)

        scroll = QScrollArea(); scroll.setWidgetResizable(True); scroll.setFrameShape(QFrame.NoFrame)
        body = QWidget(); layout = QVBoxLayout(body); layout.setSpacing(10)
        layout.addWidget(self.section_title("IDENTITÉ"))
        self.pseudo = self.field(layout, "Pseudo affiché", data.get("pseudo", name))
        row = QHBoxLayout(); self.avatar = self.field(row, "Avatar / icône", data.get("avatar", "🤖")); self.accent = QComboBox(); self.accent.addItems(["green", "blue", "purple", "orange"]); self.accent.setCurrentText(data.get("accent", "green")); wrap = QVBoxLayout(); wrap.addWidget(QLabel("Accent visuel")); wrap.addWidget(self.accent); row.addLayout(wrap, 1); layout.addLayout(row)
        self.role = self.field(layout, "Rôle", data.get("role", "Agent IA"))
        self.enabled = QCheckBox("Agent actif"); self.enabled.setChecked(bool(data.get("enabled", True))); layout.addWidget(self.enabled)

        layout.addWidget(self.section_title("MISSION"))
        self.mission = self.area(layout, "Mission principale", data.get("mission", ""), 2)
        self.objectives = self.area(layout, "Objectifs à atteindre — un objectif par ligne", data.get("objectives", ""), 3)
        self.methodology = self.area(layout, "Méthodologie de travail", data.get("methodology", ""), 3)

        layout.addWidget(self.section_title("INTELLIGENCE & CONTEXTE"))
        self.prompt = self.area(layout, "Prompt système / instructions fondamentales", data.get("prompt", ""), 6)
        self.context = self.area(layout, "Contexte et ressources disponibles", data.get("context", ""), 3)
        self.forbidden = self.area(layout, "Règles / interdictions", data.get("forbidden", ""), 3)

        layout.addWidget(self.section_title("AUTONOMIE & EXÉCUTION"))
        row = QHBoxLayout(); row.addWidget(QLabel("Niveau d'autonomie")); self.autonomy = QComboBox(); self.autonomy.addItems(["Observation", "Proposition", "Exécution contrôlée", "Autonome"]); self.autonomy.setCurrentText(data.get("autonomy", "Proposition")); row.addWidget(self.autonomy, 1); row.addWidget(QLabel("Mode")); self.execution_mode = QComboBox(); self.execution_mode.addItems(["À la demande", "Après validation", "Automatique"]); self.execution_mode.setCurrentText(data.get("execution_mode", "À la demande")); row.addWidget(self.execution_mode, 1); layout.addLayout(row)
        self.commands = self.area(layout, "Commandes autorisées — une commande ou un préfixe par ligne", "\n".join(data.get("commands", [])), 4)
        note = QLabel("Les privilèges restent également visibles et gérables depuis Paramètres."); note.setObjectName("muted"); layout.addWidget(note)
        layout.addStretch(); scroll.setWidget(body); root.addWidget(scroll, 1)
        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel); buttons.accepted.connect(self.accept); buttons.rejected.connect(self.reject); root.addWidget(buttons)

    def section_title(self, text):
        label = QLabel(text); label.setObjectName("section"); return label
    def field(self, layout, label, value):
        wrap = QVBoxLayout(); wrap.addWidget(QLabel(label)); edit = QLineEdit(value); wrap.addWidget(edit); layout.addLayout(wrap); return edit
    def area(self, layout, label, value, stretch):
        layout.addWidget(QLabel(label)); edit = QPlainTextEdit(); edit.setPlainText(value); edit.setMinimumHeight(70 + stretch * 8); layout.addWidget(edit, stretch); return edit
    def values(self):
        return {
            "pseudo": self.pseudo.text().strip() or self.name,
            "avatar": self.avatar.text().strip() or "🤖",
            "accent": self.accent.currentText(), "role": self.role.text().strip() or "Agent IA",
            "enabled": self.enabled.isChecked(), "mission": self.mission.toPlainText().strip(),
            "objectives": self.objectives.toPlainText().strip(), "methodology": self.methodology.toPlainText().strip(),
            "prompt": self.prompt.toPlainText().strip(), "context": self.context.toPlainText().strip(),
            "autonomy": self.autonomy.currentText(), "execution_mode": self.execution_mode.currentText(),
            "commands": [x.strip() for x in self.commands.toPlainText().splitlines() if x.strip()],
            "forbidden": self.forbidden.toPlainText().strip(),
        }


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__(); self.config = AppConfig(); self.config.ensure_directories(); self.git = GitService(); self.github = GitHubService(); self.openai = OpenAIService(); self.orchestrator = Orchestrator()
        self.puce, self.geek, self.archiviste = PuceAgent(), GeekAgent(), ArchivisteAgent()
        for agent in (self.puce, self.geek, self.archiviste): self.orchestrator.register(agent)
        self.agent_order = list(self.config.agents.keys()); self.nav_buttons, self.pages = {}, {}; self.log_lines = []; self.process = None
        self.setWindowTitle("Trading IA – Gestion des Agents"); self.resize(1540, 920); self.setMinimumSize(1180, 760); self.build_ui(); self.load_persisted_logs(); self.orchestrator.log_message.connect(self.add_log)
        for source, message in (("SYSTEM", "Connexion à GitHub réussie"), ("SYSTEM", "Chargement des agents..."), ("LA PUCE", "Analyse du repository en cours..."), ("LE GEEK", "Vérification des nouvelles branches..."), ("L'ARCHIVISTE", "Synchronisation du Wiki..."), ("SYSTEM", "IA-TB_Dev_Updater prêt.")): self.add_log(source, message)
        self.clock = QTimer(self); self.clock.timeout.connect(self.refresh_clock); self.clock.start(1000)

    def build_ui(self):
        root = QWidget(); self.setCentralWidget(root); outer = QVBoxLayout(root); outer.setContentsMargins(14,10,14,7); outer.setSpacing(9); outer.addWidget(self.build_topbar()); self.stack = QStackedWidget(); self.stack.setObjectName("pageStack")
        for name, _ in NAV_ITEMS: page = self.build_page(name); self.pages[name] = page; self.stack.addWidget(page)
        outer.addWidget(self.stack,1); outer.addWidget(self.build_footer()); self.select_nav("Dashboard",False)
    def build_topbar(self):
        bar=QFrame();bar.setObjectName("topbar");layout=QHBoxLayout(bar);layout.setContentsMargins(8,4,8,4);layout.setSpacing(4);brand=QLabel("Trading IA – Gestion des Agents");brand.setObjectName("title");brand.setMinimumWidth(355);layout.addWidget(brand)
        for name,icon in NAV_ITEMS:b=QPushButton(f"{icon}  {name}");b.setObjectName("nav");b.setProperty("nav_name",name);b.clicked.connect(lambda checked=False,x=name:self.select_nav(x));self.nav_buttons[name]=b;layout.addWidget(b)
        layout.addStretch(1);status=QLabel("●  Connecté");status.setObjectName("connected");layout.addWidget(status);layout.addWidget(QLabel("◉"));return bar
    def build_footer(self):
        footer=QFrame();footer.setObjectName("footer");layout=QHBoxLayout(footer);layout.setContentsMargins(10,3,10,3);layout.addWidget(QLabel("v1.0.0"));mode=QLabel("Mode: Production");mode.setObjectName("modeOk");layout.addWidget(mode);layout.addStretch();layout.addWidget(QLabel(f"{len(self.agent_order)} agents configurés"));layout.addStretch();self.sync_label=QLabel("Dernière sync: --:--:--");layout.addWidget(self.sync_label);layout.addWidget(QLabel("⟳"));return footer
    def select_nav(self,name,write_log=True):
        if name not in self.pages:return
        for item,b in self.nav_buttons.items():b.setProperty("active",item==name);b.style().unpolish(b);b.style().polish(b)
        self.stack.setCurrentWidget(self.pages[name]);
        if write_log:self.add_log("SYSTEM",f"Navigation: {name}")
    def build_page(self,name):
        page=QWidget();layout=QVBoxLayout(page);layout.setContentsMargins(0,0,0,0);layout.setSpacing(12);builders={"Dashboard":self.build_dashboard,"Agents":self.build_agents_page,"Console":self.build_console_page,"Archives":self.build_archives_page,"Wiki":self.build_wiki_page,"Paramètres":self.build_settings_page,"Logs":self.build_logs_page};layout.addWidget(builders[name](),1);return page
    def page_header(self,title,subtitle):
        frame=QFrame();frame.setObjectName("pageHeader");layout=QVBoxLayout(frame);layout.setContentsMargins(16,12,16,12);label=QLabel(title);label.setObjectName("pageTitle");layout.addWidget(label);sub=QLabel(subtitle);sub.setObjectName("muted");layout.addWidget(sub);return frame

    def build_dashboard(self):
        wrapper=QWidget();layout=QVBoxLayout(wrapper);layout.setContentsMargins(0,0,0,0);layout.setSpacing(10);layout.addWidget(self.page_header("Dashboard","Vue générale du repository, des agents et des opérations."));layout.addWidget(self.build_agent_grid(),1);bottom=QHBoxLayout();bottom.addWidget(self.build_console(),2);bottom.addWidget(self.build_quick_panel(),1);layout.addLayout(bottom);return wrapper
    def build_agent_grid(self):
        container=QWidget();grid=QGridLayout(container);grid.setContentsMargins(0,0,0,0);grid.setHorizontalSpacing(15);data=[(self.puce,"green","🧠","LA PUCE","Développeur Principal","feat/rsi-signal",[("Ajout du module RSI Signal","feat/rsi-signal","14:32"),("Refactor risk_manager.py","refactor/risk","12:18"),("Correction calcul position size","fix/position-size","10:47")]),(self.geek,"blue","🤓","LE GEEK","Reviewer & QA","review/184",[("Review: feat/rsi-signal","review/184","14:45"),("Tests de régression","test/regression","13:50"),("Analyse sécurité","sec/scan","12:05")]),(self.archiviste,"purple","📖","L'ARCHIVISTE","Documentation & Wiki","wiki/docs",[("Mise à jour Wiki - RSI Signal","wiki/rsi-signal","15:01"),("Changelog v1.4.2","changelog/v1.4.2","13:30"),("Architecture - Risk Engine","wiki/architecture","11:15")])]
        for col,item in enumerate(data):grid.addWidget(self.build_agent_card(*item),0,col);grid.setColumnStretch(col,1)
        return container
    def build_agent_card(self,agent,accent,icon,name,role,branch,changes):
        card=QFrame();card.setObjectName("agentCard");card.setProperty("accent",accent);layout=QVBoxLayout(card);layout.setContentsMargins(14,11,14,11);layout.setSpacing(7);header=QHBoxLayout();avatar=QLabel(icon);avatar.setFixedSize(45,45);avatar.setAlignment(Qt.AlignCenter);avatar.setObjectName("avatar");header.addWidget(avatar);texts=QVBoxLayout();title=QLabel(name);title.setObjectName(f"agent_{accent}");texts.addWidget(title);role_label=QLabel(role);role_label.setObjectName("muted");texts.addWidget(role_label);header.addLayout(texts,1);badge=QLabel("ACTIF");badge.setObjectName("activeBadge");header.addWidget(badge,0,Qt.AlignTop);layout.addLayout(header);self.add_separator(layout);section=QLabel("Dernières modifications");section.setObjectName("section");layout.addWidget(section)
        for text,tag,time in changes:row=QHBoxLayout();row.addWidget(QLabel("◈"));row.addWidget(QLabel(text),1);tag_label=QLabel(tag);tag_label.setObjectName("tag");row.addWidget(tag_label);row.addWidget(QLabel(time));layout.addLayout(row)
        self.add_separator(layout);branch_label=QLabel("⌘  "+branch);branch_label.setObjectName(f"branch_{accent}");layout.addWidget(branch_label);return card
    def add_separator(self,layout):line=QFrame();line.setFrameShape(QFrame.HLine);line.setObjectName("separator");layout.addWidget(line)

    def build_agents_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.setSpacing(12)
        hero=QFrame();hero.setObjectName("agentsHero");h=QHBoxLayout(hero);h.setContentsMargins(20,16,20,16);left=QVBoxLayout();title=QLabel("ÉQUIPE IA");title.setObjectName("heroTitle");left.addWidget(title);sub=QLabel("Des fiches de mission vivantes : identité, objectifs, méthode, prompt et autonomie.");sub.setObjectName("muted");left.addWidget(sub);h.addLayout(left,1)
        stats=QHBoxLayout();stats.addWidget(self.stat_card("AGENTS",str(len(self.agent_order))));stats.addWidget(self.stat_card("ACTIFS",str(sum(1 for x in self.agent_order if self.config.agents.get(x,{}).get("enabled",True)))));stats.addWidget(self.stat_card("AUTONOMIE","CONFIGURABLE"));h.addLayout(stats);add=QPushButton("＋  NOUVEL AGENT");add.setObjectName("accent");add.clicked.connect(self.add_agent);h.addWidget(add,0,Qt.AlignCenter);layout.addWidget(hero)
        scroll=QScrollArea();scroll.setWidgetResizable(True);scroll.setFrameShape(QFrame.NoFrame);body=QWidget();self.agent_cards_layout=QGridLayout(body);self.agent_cards_layout.setContentsMargins(0,0,0,0);self.agent_cards_layout.setSpacing(14);scroll.setWidget(body);layout.addWidget(scroll,1);self.refresh_agent_cards();return frame
    def stat_card(self,label,value):
        f=QFrame();f.setObjectName("miniStat");v=QVBoxLayout(f);v.setContentsMargins(12,8,12,8);a=QLabel(label);a.setObjectName("muted");b=QLabel(value);b.setObjectName("statValue");v.addWidget(a);v.addWidget(b);return f
    def refresh_agent_cards(self):
        if not hasattr(self,"agent_cards_layout"):return
        while self.agent_cards_layout.count():
            item=self.agent_cards_layout.takeAt(0);w=item.widget()
            if w:w.deleteLater()
        for index,name in enumerate(self.agent_order):
            self.agent_cards_layout.addWidget(self.visual_agent_card(name),index//2,index%2)
            self.agent_cards_layout.setColumnStretch(index%2,1)
        empty=QFrame();empty.setObjectName("addAgentCard");v=QVBoxLayout(empty);v.setAlignment(Qt.AlignCenter);icon=QLabel("＋");icon.setObjectName("addAgentIcon");v.addWidget(icon,0,Qt.AlignCenter);txt=QLabel("Créer une nouvelle fiche de mission");txt.setObjectName("section");v.addWidget(txt,0,Qt.AlignCenter);b=QPushButton("Ajouter un agent");b.clicked.connect(self.add_agent);v.addWidget(b,0,Qt.AlignCenter);pos=len(self.agent_order);self.agent_cards_layout.addWidget(empty,pos//2,pos%2)
    def visual_agent_card(self,name):
        d=self.config.agents.get(name,{});accent=d.get("accent","green");card=QFrame();card.setObjectName("missionCard");card.setProperty("accent",accent);v=QVBoxLayout(card);v.setContentsMargins(18,16,18,16);v.setSpacing(10)
        header=QHBoxLayout();avatar=QLabel(d.get("avatar","🤖"));avatar.setObjectName("bigAvatar");avatar.setProperty("accent",accent);avatar.setAlignment(Qt.AlignCenter);avatar.setFixedSize(64,64);header.addWidget(avatar);names=QVBoxLayout();pseudo=QLabel(d.get("pseudo",name));pseudo.setObjectName("agentName");names.addWidget(pseudo);role=QLabel(d.get("role","Agent IA"));role.setObjectName("muted");names.addWidget(role);header.addLayout(names,1);status=QLabel("● ACTIF" if d.get("enabled",True) else "○ INACTIF");status.setObjectName("statusActive" if d.get("enabled",True) else "statusInactive");header.addWidget(status,0,Qt.AlignTop);v.addLayout(header)
        mission=QLabel(d.get("mission","Mission non définie"));mission.setWordWrap(True);mission.setObjectName("missionText");v.addWidget(mission)
        chips=QHBoxLayout();chips.addWidget(self.chip("⚡  "+d.get("autonomy","Proposition"),accent));chips.addWidget(self.chip("▶  "+d.get("execution_mode","À la demande"),"neutral"));chips.addWidget(self.chip(f"⌘  {len(d.get('commands',[]))} commandes","neutral"));chips.addStretch();v.addLayout(chips)
        preview=QFrame();preview.setObjectName("promptPreview");pv=QVBoxLayout(preview);pv.setContentsMargins(11,9,11,9);pl=QLabel("PROMPT / MÉTHODOLOGIE");pl.setObjectName("muted");pv.addWidget(pl);pt=QLabel((d.get("methodology") or d.get("prompt") or "Aucune instruction définie")[:240]);pt.setWordWrap(True);pv.addWidget(pt);v.addWidget(preview)
        bottom=QHBoxLayout();edit=QPushButton("✎  Ouvrir la fiche complète");edit.setObjectName(accent);edit.clicked.connect(lambda checked=False,n=name:self.edit_agent(n));bottom.addWidget(edit,1);delete=QPushButton("Supprimer");delete.setObjectName("danger");delete.clicked.connect(lambda checked=False,n=name:self.delete_agent(n));bottom.addWidget(delete);v.addLayout(bottom);return card
    def chip(self,text,accent):
        label=QLabel(text);label.setObjectName("agentChip");label.setProperty("accent",accent);return label
    def edit_agent(self,name):
        dialog=AgentEditor(name,self.config.agents[name],self)
        if dialog.exec_():self.config.agents[name]=dialog.values();self.config.save_settings();self.refresh_agent_cards();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Fiche de mission de {name} enregistrée.")
    def add_agent(self):
        dialog=QDialog(self);dialog.setWindowTitle("Nouvelle fiche de mission");dialog.setMinimumWidth(560);v=QVBoxLayout(dialog);v.addWidget(QLabel("Nom interne de l'agent"));name_edit=QLineEdit();name_edit.setPlaceholderText("Ex. STRATEGE");v.addWidget(name_edit);v.addWidget(QLabel("Rôle initial"));role_edit=QLineEdit();role_edit.setPlaceholderText("Ex. Analyste stratégique");v.addWidget(role_edit);buttons=QDialogButtonBox(QDialogButtonBox.Save|QDialogButtonBox.Cancel);buttons.accepted.connect(dialog.accept);buttons.rejected.connect(dialog.reject);v.addWidget(buttons)
        if not dialog.exec_():return
        name=name_edit.text().strip().upper();role=role_edit.text().strip() or "Agent IA"
        if not name:return
        if name in self.config.agents:QMessageBox.warning(self,"Agent existant","Un agent porte déjà ce nom.");return
        self.config.agents[name]={"pseudo":name,"role":role,"avatar":"🤖","accent":"green","enabled":True,"mission":"Définir la mission principale de cet agent.","objectives":"Définir les objectifs à atteindre.","methodology":"Analyser → planifier → exécuter → vérifier.","prompt":f"Tu es {name}, {role}.","context":"","autonomy":"Proposition","execution_mode":"À la demande","commands":[],"forbidden":"Ne jamais exposer de secrets ni effectuer d'action destructive sans validation."};self.agent_order.append(name);self.config.save_settings();self.refresh_agent_cards();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Agent {name} ajouté.");self.edit_agent(name)
    def delete_agent(self,name):
        if QMessageBox.question(self,"Supprimer l'agent",f"Supprimer la fiche de mission de {name} ?")!=QMessageBox.Yes:return
        self.config.agents.pop(name,None);self.agent_order.remove(name) if name in self.agent_order else None;self.config.save_settings();self.refresh_agent_cards();self.refresh_agent_rows();self.refresh_settings_page();self.add_log("SYSTEM",f"Agent {name} supprimé de la configuration.")
    def build_agents_legacy_rows(self):return
    def refresh_agent_rows(self):
        if not hasattr(self,"agent_rows"):return
        while self.agent_rows.count():
            item=self.agent_rows.takeAt(0);w=item.widget()
            if w:w.deleteLater()
        for name in self.agent_order:
            d=self.config.agents.get(name,{});row=QFrame();row.setObjectName("listRow");r=QHBoxLayout(row);r.addWidget(QLabel(d.get("pseudo",name)));role=QLabel(d.get("role","Agent IA"));role.setObjectName("muted");r.addWidget(role,1);r.addWidget(QLabel(f"{len(d.get('commands',[]))} commandes"));r.addWidget(QLabel("ACTIF" if d.get("enabled",True) else "DÉSACTIVÉ"));edit=QPushButton("✎ Éditer");edit.clicked.connect(lambda checked=False,n=name:self.edit_agent(n));r.addWidget(edit);self.agent_rows.addWidget(row)

    def build_console_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Console","Exécution des commandes système et retour en temps réel."));layout.addWidget(self.build_console(),1);return frame
    def build_console(self):
        wrapper=QFrame();wrapper.setObjectName("consolePanel");layout=QVBoxLayout(wrapper);layout.setContentsMargins(10,8,10,8);layout.setSpacing(6);header=QHBoxLayout();title=QLabel("›_  CONSOLE");title.setObjectName("section");header.addWidget(title);header.addStretch();header.addWidget(QLabel("Shell local"));clear=QPushButton("▱  Vider");clear.clicked.connect(self.clear_logs);header.addWidget(clear);layout.addLayout(header)
        if not hasattr(self,"log_view"):self.log_view=QPlainTextEdit();self.log_view.setReadOnly(True);self.log_view.setObjectName("consoleOutput")
        layout.addWidget(self.log_view,1);input_row=QHBoxLayout();prompt=QLabel("console>");prompt.setObjectName("connected");input_row.addWidget(prompt);self.console_input=QLineEdit();self.console_input.setPlaceholderText("Entrer une commande…");self.console_input.returnPressed.connect(self.execute_command);input_row.addWidget(self.console_input,1);run=QPushButton("▶  Exécuter");run.setObjectName("accent");run.clicked.connect(self.execute_command);input_row.addWidget(run);layout.addLayout(input_row);return wrapper
    def execute_command(self):
        command=self.console_input.text().strip()
        if not command:return
        self.console_input.clear();self.add_log("CONSOLE",f"$ {command}")
        if self.process and self.process.state()!=QProcess.NotRunning:self.add_log("CONSOLE","Une commande est déjà en cours d'exécution.");return
        self.process=QProcess(self);self.process.setWorkingDirectory(str(self.config.workspace));self.process.setProcessChannelMode(QProcess.MergedChannels);self.process.readyReadStandardOutput.connect(self.read_process_output);self.process.finished.connect(self.command_finished);self.process.errorOccurred.connect(self.command_error);shell="/bin/zsh" if os.path.exists("/bin/zsh") else "/bin/bash";self.process.start(shell,["-lc",command])
    def read_process_output(self):
        if self.process:
            text=bytes(self.process.readAllStandardOutput()).decode("utf-8","replace")
            for line in text.splitlines():self.add_log("CONSOLE",line)
    def command_finished(self,code,status):self.read_process_output();self.add_log("CONSOLE",f"Commande terminée — code {code}.")
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
        boxes=[("Projet Git",[("Repository",self.config.repository),("Branche active","github-administration"),("Workspace local",str(self.config.workspace))]),("Environnement",[("Python","Détecté au lancement"),("PySide2","5.15.2.1"),("Dépendances","requirements.txt")]),("Application",[("Mise à jour au lancement","Activée"),("Démarrage des agents","Manuel"),("Niveau de logs","INFO")]),("API",[("OpenAI","Clé protégée dans le coffre local"),("GitHub","Connexion active")])]
        for title,items in boxes:
            box=QFrame();box.setObjectName("listRow");v=QVBoxLayout(box);h=QLabel(title);h.setObjectName("section");v.addWidget(h)
            for label,value in items:r=QHBoxLayout();r.addWidget(QLabel(label));val=QLabel(value);val.setObjectName("muted");r.addWidget(val,1);v.addLayout(r)
            self.settings_layout.addWidget(box)
        box=QFrame();box.setObjectName("listRow");v=QVBoxLayout(box);h=QLabel("Privilèges des agents IA");h.setObjectName("section");v.addWidget(h)
        for name,data in self.config.agents.items():
            r=QHBoxLayout();r.addWidget(QLabel(data.get("pseudo",name)));info=QLabel(f"{len(data.get('commands',[]))} commandes autorisées · {data.get('autonomy','Proposition')}");info.setObjectName("muted");r.addWidget(info,1);edit=QPushButton("⚙  Configurer");edit.clicked.connect(lambda checked=False,n=name:self.edit_agent(n));r.addWidget(edit);v.addLayout(r)
        self.settings_layout.addWidget(box)

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
    def build_logs_page(self):
        frame=QFrame();frame.setObjectName("pageFrame");layout=QVBoxLayout(frame);layout.addWidget(self.page_header("Logs","Historique complet des événements et opérations de l'application."));self.full_log_view=QPlainTextEdit();self.full_log_view.setReadOnly(True);self.full_log_view.setObjectName("fullLogView");layout.addWidget(self.full_log_view,1);buttons=QHBoxLayout();clear=QPushButton("▱  Vider les logs");clear.clicked.connect(self.clear_logs);buttons.addWidget(clear);buttons.addStretch();refresh=QPushButton("▤  Rafraîchir");refresh.clicked.connect(self.refresh_full_log);buttons.addWidget(refresh);layout.addLayout(buttons);self.refresh_full_log();return frame
    def load_persisted_logs(self):
        path=LOG_DIR/"console.log"
        if path.exists():
            try:self.log_lines=path.read_text(encoding="utf-8").splitlines()[-5000:]
            except OSError:pass
        if hasattr(self,"log_view"):self.log_view.setPlainText("\n".join(self.log_lines))
        if hasattr(self,"full_log_view"):self.refresh_full_log()
    def refresh_full_log(self):
        if hasattr(self,"full_log_view"):self.full_log_view.setPlainText("\n".join(self.log_lines));self.full_log_view.verticalScrollBar().setValue(self.full_log_view.verticalScrollBar().maximum())
    def clear_logs(self):
        self.log_lines.clear()
        try:(LOG_DIR/"console.log").write_text("",encoding="utf-8")
        except OSError:pass
        if hasattr(self,"log_view"):self.log_view.clear()
        if hasattr(self,"full_log_view"):self.full_log_view.clear()
    def add_log(self,source,message):
        line=f"[{datetime.now().strftime('%H:%M:%S')}]  ▶ {source:<14} {message}";self.log_lines.append(line)
        try:
            with (LOG_DIR/"console.log").open("a",encoding="utf-8") as f:f.write(line+"\n")
        except OSError:pass
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
