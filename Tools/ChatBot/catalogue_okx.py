#!/usr/bin/env python3
"""Extract factual API identifiers from an operator-downloaded official OKX V5 page."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import argparse
from datetime import date

class Documentation(HTMLParser):
    def __init__(self):
        super().__init__(); self.heading=None; self.heading_id=''; self.heading_text=[]; self.headings={}; self.depth=0; self.block=[]; self.operations={}
    def handle_starttag(self,tag,attrs):
        if re.fullmatch('h[1-6]',tag): self.heading=int(tag[1]); self.heading_id=dict(attrs).get('id',''); self.heading_text=[]
        if tag in ('pre','code'):
            if not self.depth:self.block=[]
            self.depth+=1
    def handle_data(self,text):
        if self.heading:self.heading_text.append(text)
        if self.depth:self.block.append(text)
    def handle_endtag(self,tag):
        if self.heading and tag=='h'+str(self.heading):
            level=self.heading; self.headings={k:v for k,v in self.headings.items() if k<level}; self.headings[level]=(self.heading_id,' '.join(''.join(self.heading_text).split())); self.heading=None
        if tag in ('pre','code') and self.depth:
            self.depth-=1
            if not self.depth:self.consume(''.join(self.block))
    def consume(self,text):
        meaningful=[v for v in self.headings.values() if v[1].lower() not in ['http request','request example','response example','url path','request parameters','response parameters','push data parameters']];anchor,title=meaningful[-1] if meaningful else ('','API operation'); family=next(iter(self.headings.values()),('','Overview'))[1]
        ref='https://www.okx.com/docs-v5/en/#'+anchor
        for method,route in re.findall(r'\b(GET|POST|PUT|DELETE)\s+(/api/v5/[a-zA-Z0-9_/-]+)',text):
            ident='rest.'+method.lower()+'.'+route.removeprefix('/api/v5/').replace('/','.'); self.operations[ident]={'id':ident,'transport':'REST','method':method,'path':route,'family':family,'title':title,'reference':ref,'documentation_status':'DOCUMENTED','execution_status':'DESCRIPTIVE_ONLY'}
        if 'websocket' in anchor or '-ws-' in anchor:
            for channel in re.findall(r'"channel"\s*:\s*"([a-zA-Z0-9_-]+)"',text):
                ident='ws.channel.'+channel; self.operations.setdefault(ident,{'id':ident,'transport':'WEBSOCKET_CHANNEL','channel':channel,'family':family,'title':title,'reference':ref,'documentation_status':'DOCUMENTED','execution_status':'DESCRIPTIVE_ONLY'})
            for op in re.findall(r'"op"\s*:\s*"([a-zA-Z0-9_-]+)"',text):
                if op in ['subscribe','unsubscribe','login']:continue
                ident='ws.operation.'+op; self.operations.setdefault(ident,{'id':ident,'transport':'WEBSOCKET_OPERATION','operation':op,'family':family,'title':title,'reference':ref,'documentation_status':'DOCUMENTED','execution_status':'DESCRIPTIVE_ONLY'})

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('html',help='Official OKX V5 HTML page');cli.add_argument('output',help='Output JSON catalogue');cli.add_argument('--retrieved-on',default=date.today().isoformat());args=cli.parse_args()
    data=Path(args.html).read_bytes(); parser=Documentation();parser.feed(data.decode());ops=sorted(parser.operations.values(),key=lambda x:x['id']);assert any(x.get('path')=='/api/v5/trade/order' for x in ops),'Official API page missing expected identifiers'
    out={'schema':'iatb.okx-api-catalog/1.0','source':'https://www.okx.com/docs-v5/en/','retrieved_on':args.retrieved_on,'source_sha256':hashlib.sha256(data).hexdigest(),'scope':'REST identifiers and WebSocket channels/operations explicitly present in the official page; subscriptions are one entry per literal channel. No execution authority.','operations':ops}
    Path(args.output).write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n');print(json.dumps({'operations':len(ops),'rest':sum(x['transport']=='REST' for x in ops),'websocket':sum(x['transport']!='REST' for x in ops),'families':sorted(set(x['family'] for x in ops))}))
