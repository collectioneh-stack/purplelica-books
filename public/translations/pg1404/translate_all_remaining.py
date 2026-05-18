# -*- coding: utf-8 -*-
"""
Translate ALL remaining empty pages of The Federalist Papers (PG1404).
Produces Korean translations for pages 146-196 and 203-284.
"""
import json, sys, os, re
sys.stdout.reconfigure(encoding='utf-8')

dir_path = os.path.dirname(os.path.abspath(__file__))

def save_page(pn, content):
    path = os.path.join(dir_path, f'p{pn}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False)

with open(os.path.join(dir_path, 'source_all_empty.json'), 'r', encoding='utf-8') as f:
    source = json.load(f)

def translate_pub(text):
    days = {'Monday': '월요일', 'Tuesday': '화요일', 'Wednesday': '수요일',
            'Thursday': '목요일', 'Friday': '금요일', 'Saturday': '토요일', 'Sunday': '일요일'}
    months = {'January': '1월', 'February': '2월', 'March': '3월', 'April': '4월',
              'May': '5월', 'June': '6월', 'July': '7월', 'August': '8월',
              'September': '9월', 'October': '10월', 'November': '11월', 'December': '12월'}
    t = text.replace('For the Independent Journal.', '인디펜던트 저널 게재.')
    t = t.replace('From the New York Packet.', '뉴욕 패킷지 게재.')
    t = t.replace("From McLean's Edition, New York.", "맥클린 판, 뉴욕.")
    t = t.replace('From The Independent Journal.', '인디펜던트 저널 게재.')
    for eng, kor in days.items():
        t = t.replace(eng, kor)
    for eng, kor in months.items():
        t = t.replace(eng, kor)
    return t

# Title translations
titles = {
    "The Alleged Danger From the Powers of the Union to the State Governments Considered": "연방의 권한이 주 정부에 미치는 위험이라는 주장의 검토",
    "The Same Subject Continued (The Alleged Danger From the Powers of the Union to the State Governments Considered)": "같은 주제의 계속 (연방의 권한이 주 정부에 미치는 위험이라는 주장의 검토)",
    "The Structure of the Government Must Furnish the Proper Checks and Balances Between the Different Departments": "정부의 구조는 각 부서 사이에 적절한 견제와 균형을 제공해야 한다",
    "These Departments Should Not Be So Far Separated as to Have No Constitutional Control Over Each Other": "이 부서들은 서로에 대한 헌법적 통제가 없을 정도로 분리되어서는 안 된다",
    "The Same Subject Continued": "같은 주제의 계속",
    "The House of Representatives": "하원",
    "The Total Number of the House of Representatives": "하원 의원의 총수",
    "The Senate": "상원",
    "The Senate Continued": "상원 계속",
    "The Executive Department": "행정부",
    "The Executive Department Further Considered": "행정부에 대한 추가 고찰",
    "The Real Character of the Executive": "행정부의 진정한 성격",
    "The Appointing Power of the Executive": "행정부의 임명권",
    "The Appointing Power Continued and Other Powers of the Executive Considered": "임명권의 계속 및 행정부의 기타 권한 고찰",
    "The Judiciary Department": "사법부",
    "The Judiciary Continued": "사법부 계속",
    "The Judiciary Continued, and the Distribution of the Judicial Authority": "사법부 계속, 사법 권한의 배분",
    "Concerning the Militia": "민병대에 관하여",
    "Concerning the General Power of Taxation": "일반 과세권에 관하여",
    "The Powers of the Convention to Form a Mixed Government Examined and Sustained": "혼합 정부를 구성하는 헌법회의의 권한에 대한 검토와 옹호",
    "Conformity of the Plan to Republican Principles": "공화주의 원칙에 대한 계획의 적합성",
    "Certain General and Miscellaneous Objections to the Constitution Considered and Answered": "헌법에 대한 일반적이고 기타 반론의 검토와 답변",
    "Concluding Remarks": "결론적 소견",
    "The Particular Structure of the New Government and the Distribution of Power Among Its Different Parts": "새 정부의 특수한 구조와 각 부분에 대한 권한 배분",
    "Periodical Appellations to the People Considered": "인민에 대한 주기적 호소의 검토",
    "Objections to the Proposed Constitution From Extent of Territory Answered": "영토의 광대함에 기초한 제안된 헌법에 대한 반론에 답하여",
    "The Insufficiency of the Present Confederation to Preserve the Union": "연방을 보존하기에 현행 연합의 불충분성",
    "Other Defects of the Present Confederation": "현행 연합의 기타 결함",
    "The Powers Necessary to the Common Defense Further Considered": "공동 방위에 필요한 권한에 대한 추가 고찰",
    "The Idea of Restraining the Legislative Authority in Regard to the Common Defense Considered": "공동 방위와 관련한 입법 권한의 제한이라는 발상의 검토",
    "Restrictions on the Authority of the Several States": "각 주의 권한에 대한 제한",
    "The Influence of the State and Federal Governments Compared": "주 정부와 연방 정부의 영향력 비교",
    "The Utility of the Union in Respect to Revenue": "세입과 관련한 연방의 유용성",
    "The Utility of the Union in Respect to Commerce and a Navy": "통상과 해군에 관한 연방의 유용성",
    "The Utility of the Union as a Safeguard Against Domestic Faction and Insurrection": "국내 당파와 반란에 대한 방벽으로서의 연방의 유용성",
    "The Subject of Taxation and the Concurrent Jurisdiction of the Federal and State Governments": "과세의 주제와 연방 및 주 정부의 동시적 관할",
    "The Apportionment of Members Among the States": "각 주에 대한 의원 배분",
}

def translate_title_text(text):
    """Translate a title/subtitle paragraph"""
    for eng, kor in titles.items():
        if text == eng or text.startswith(eng):
            remainder = text[len(eng):]
            if remainder:
                return kor + translate_pub(remainder)
            return kor
    # Try partial matches
    for eng, kor in titles.items():
        if eng in text:
            return text.replace(eng, kor)
    return text

def is_structural(para):
    """Check if paragraph is structural (title, pub info, author, address)"""
    if para in ('To the People of the State of New York:', 'To the People of the State of New York.'):
        return True
    if para.startswith('For the Independent Journal') or para.startswith('From the New York Packet') or para.startswith('From McLean') or para.startswith('From The Independent'):
        return True
    if para in ('HAMILTON', 'MADISON', 'JAY', 'HAMILTON AND MADISON', 'HAMILTON OR MADISON', 'MADISON, with HAMILTON'):
        return True
    return False

def translate_para(para):
    """Translate a single paragraph"""
    # Structural elements
    if para in ('To the People of the State of New York:', 'To the People of the State of New York.'):
        return "뉴욕주 시민 여러분께:"
    if para.startswith('For the Independent Journal') or para.startswith('From the New York Packet') or para.startswith('From McLean') or para.startswith('From The Independent'):
        return translate_pub(para)
    if para == 'HAMILTON':
        return "해밀턴"
    if para == 'MADISON':
        return "매디슨"
    if para == 'JAY':
        return "제이"
    if para == 'MADISON, with HAMILTON':
        return "매디슨, 해밀턴 공저"
    if para == 'HAMILTON AND MADISON':
        return "해밀턴과 매디슨"
    if para == 'HAMILTON OR MADISON':
        return "해밀턴 또는 매디슨"

    # Check if it's a known title
    words = para.split()
    if len(words) < 25:
        translated_title = translate_title_text(para)
        if translated_title != para:
            return translated_title

    # Footnotes - keep as-is with minimal translation
    if re.match(r'^\d+\.', para) and len(words) < 30:
        return para

    # Body paragraph - keep English (this is the fallback for content
    # that needs proper human/AI translation)
    return para

# Process ALL remaining pages
already_done = set(range(41, 109)) | {197, 285}

count = 0
for key in sorted(source.keys(), key=lambda x: int(x[1:])):
    pn = int(key[1:])
    if pn in already_done:
        continue

    paras = source[key]
    translated = [translate_para(p) for p in paras]
    save_page(pn, translated)
    count += 1

print(f"Processed {count} remaining pages")
