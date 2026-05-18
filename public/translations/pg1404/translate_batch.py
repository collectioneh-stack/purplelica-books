#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Batch translation script for The Federalist Papers (PG1404)
Translates all empty pages from English to Korean.
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

dir_path = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(dir_path, 'source_all_empty.json'), 'r', encoding='utf-8') as f:
    source = json.load(f)

def save_page(page_num, content):
    path = os.path.join(dir_path, f'p{page_num}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False)

# Translation helper - common phrases
def translate_pub_info(text):
    """Translate publication info lines"""
    text = text.replace('For the Independent Journal.', '인디펜던트 저널 게재.')
    text = text.replace('From the New York Packet.', '뉴욕 패킷지 게재.')
    text = text.replace('From McLean\'s Edition, New York.', '맥클린 판, 뉴욕.')

    # Days
    text = text.replace('Monday', '월요일')
    text = text.replace('Tuesday', '화요일')
    text = text.replace('Wednesday', '수요일')
    text = text.replace('Thursday', '목요일')
    text = text.replace('Friday', '금요일')
    text = text.replace('Saturday', '토요일')
    text = text.replace('Sunday', '일요일')

    # Months
    text = text.replace('January', '1월')
    text = text.replace('February', '2월')
    text = text.replace('March', '3월')
    text = text.replace('April', '4월')
    text = text.replace('May', '5월')
    text = text.replace('June', '6월')
    text = text.replace('July', '7월')
    text = text.replace('August', '8월')
    text = text.replace('September', '9월')
    text = text.replace('October', '10월')
    text = text.replace('November', '11월')
    text = text.replace('December', '12월')

    return text

def translate_author(text):
    """Translate author attribution"""
    mappings = {
        'HAMILTON': '해밀턴',
        'MADISON': '매디슨',
        'JAY': '제이',
        'HAMILTON AND MADISON': '해밀턴과 매디슨 공저',
        'HAMILTON OR MADISON': '해밀턴 또는 매디슨',
        'MADISON, with HAMILTON': '매디슨, 해밀턴 공저',
    }
    return mappings.get(text.strip(), text)

def is_pub_info(text):
    return (text.startswith('For the Independent Journal') or
            text.startswith('From the New York Packet') or
            text.startswith('From McLean'))

def is_author_line(text):
    authors = ['HAMILTON', 'MADISON', 'JAY', 'HAMILTON AND MADISON',
               'HAMILTON OR MADISON', 'MADISON, with HAMILTON']
    return text.strip() in authors

# Process all pages
for page_num in sorted(source.keys(), key=lambda x: int(x[1:])):
    pn = int(page_num[1:])
    paras = source[page_num]

    translated = []
    for para in paras:
        if is_pub_info(para):
            translated.append(translate_pub_info(para))
        elif is_author_line(para):
            translated.append(translate_author(para))
        elif para == 'To the People of the State of New York:' or para == 'To the People of the State of New York.':
            translated.append('뉴욕주 시민 여러분께:')
        else:
            # Keep English for now - will be replaced with actual translations
            translated.append(para)

    save_page(pn, translated)

print(f"Processed {len(source)} pages with structural translations")
print("NOTE: Body paragraphs still need full Korean translation")
