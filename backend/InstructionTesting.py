## Unused ??
from sklearn.metrics import confusion_matrix
import numpy as np
from dotenv import load_dotenv
from flask import Response, request
import functools
import json
from models import *
import openai
import os

def prompt_gpt_35(prompt: str, max_tokens: int, temp):
    real_temp=0
    if temp:
        real_temp = float(temp)

    # From OPEN API DIRECTLY. See documentation here: https://platform.openai.com/docs/guides/text-generation
    openai.api_key= os.getenv('API_KEY_AZURE')

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
                {"role": "user", "content": prompt}
            ],
        temperature=int(real_temp),
        max_completion_tokens=max_tokens
    )
    return response['choices'][0]['text']

def format_detection_response(response: str):
    return response.lower().strip()

dt=DialogueTree.load("dt-10")
user_messages = [
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: Tom, you are so stupid!", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: You make me feel sick Tom", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I don't like Tom", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I'll support you John", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I know John and Tom", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I'm Vivian", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: There's nothing I could do", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: This is an apple", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: Hi", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I don't like John", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I also think John is disgusting", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: I don't like John either", "label": "in"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: Tom is actually a great person.", "label": "out"},
    {"message": "Bully: Tom, Victim: John, Student: Vivian. Comment: My mother told me that it's none of my business", "label": "out"}
]

gpt_answers = []
actual_labels = []
dc = dt.get_component("dc-1")

for msg in user_messages:
    try:
        classes = dc.get_classes()
        prompt_classes = ''
        for cls in classes:
            prompt_classes += f'{cls.name}, '
        prompt_classes = prompt_classes[:prompt_classes.rindex(',')]

        instruction = f"Classify the user inputs into one of the following categories: {prompt_classes}\n; 'If none of these categories match, output 'none' as category'."

        example_num = 0
        few_shot_examples = ''
        for cls in classes:
            for example in cls.get_examples():
                example_num += 1
                few_shot_examples += f'Input {example_num}: {example}\n'
                few_shot_examples += f'Category {example_num}: {cls.name}\n'

        message_to_classify = msg['message']
        new_input = f'Input {example_num + 1}: {message_to_classify}\nCategory {example_num + 1}: '

        prompt = instruction + few_shot_examples + new_input

        predicted_class_name = format_detection_response(prompt_gpt_35(prompt, 1000,1))
        # print(predicted_class_name)
        isIncluded=False
        for cls in classes:
            if predicted_class_name.casefold() == cls.name.casefold():
                gpt_answers.append("in")
                isIncluded=True
                if msg["label"] == "out" :
                    print("in with class ", predicted_class_name, ": ",msg["message"])
        if isIncluded == False :
          gpt_answers.append("out")
          if msg["label"] == "in" :
            print("out: ", msg["message"])
    except Exception as e:
        print(f"An error occurred while processing the message '{msg['message']}': {str(e)}")
        continue

    actual_labels.append(msg["label"])

labels = ["in", "out"]
cm = confusion_matrix(gpt_answers, actual_labels, labels=labels)

print("\nConfusion Matrix (with labels):")
print("\t\tPredicted:")
print("\t\t in \t out")
for i, label in enumerate(labels):
    print(f"Actual {label}:", cm[i])