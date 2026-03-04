from flask import Response, request
import functools
import json
from models import *
import openai
import os
import itertools
from datetime import datetime

# Returns a success response with a custom status code and payload
def success_response(status: int, payload: dict=None):
    response = {'success': True}
    if payload is not None:
        response['data'] = payload
    return Response(
        response=json.dumps(response),
        status=status,
        mimetype="application/json"
    )

# Returns a failure response with a custom status code and error message
def failure_response(status: int, error_message: str):
    return Response(
        response=json.dumps({'success': False,
                             'error_message': error_message}),
        status=status,
        mimetype='application/json'
    )
    
# If it is running on a public server, a CHATBOT_BACKEND_SECRET
# env variable can be set. Every call to the backend then needs
# to provide ?backend_secret=XXXX for the call to get through
def require_secret(func):
    @functools.wraps(func)
    def decorator(*args, **kwargs):
        print(os.getenv("CHATBOT_BACKEND_SECRET"))
        if os.getenv("CHATBOT_BACKEND_SECRET"):
            secret = request.args.get('backend_secret', default=None)
            if secret != os.getenv("CHATBOT_BACKEND_SECRET"):
                return failure_response(400, "Incorrect or missing API secret.")
        return func(*args, **kwargs)
    return decorator

# Generate the next student message (whether on post or in chat)
def prompt_chatgpt_azure(system_description: str, prompt: str, max_tokens: int, temp):
    real_temp=0
    if temp:
        real_temp = float(temp)

    # From OPEN API DIRECTLY. See documentation here: https://platform.openai.com/docs/api-reference/chat
    openai.api_key= os.getenv('API_KEY_AZURE')
    
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
                    {"role": "system", "content": system_description},
                    {"role": "user", "content": prompt}
                ],
        temperature=int(real_temp),
        max_completion_tokens=max_tokens
    )
    return response['choices'][0]['message']['content']

# Generate chatbot response
def prompt_gpt_azure(prompt: str, max_tokens: int, temp):
    # From OPEN API DIRECTLY. See documentation here: https://platform.openai.com/docs/guides/text-generation
    openai.api_key= os.getenv('API_KEY_AZURE')

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
                    {"role": "user", "content": prompt}
                ],
        temperature=int(temp),
        max_completion_tokens=max_tokens
    )
    return response['choices'][0]['message']['content']

# Do basic formatting on classification prediction outputs
def format_detection_response(response: str):
    return response.lower().strip()

# Build detection prompt and perform GPT call to classify user messages into predefined categories
def perform_detection(dc: Detection, messages: list, dialogue_tree: DialogueTree) -> DetectionClass:
    # Get available classes
    classes = dc.get_classes()

    # Construct the prompt classes string
    prompt_classes = ', '.join(cls.name for cls in classes)
    
    # Instruction portion of the prompt
    instruction = (
        f"Victim's name is Alex. Bully's name is Leslie. "
        f"Classify the user inputs into one of the following categories: {prompt_classes};\n"
        "Only give the name of the category. If none of these categories match, output 'none' as category.\n"
    )

    # Few-shot examples portion of the prompt
    few_shot_examples = 'Here are some examples: '
    for example_num, cls in enumerate(classes, start=1):
        for example in cls.get_examples():
            few_shot_examples += (
                f"Example {example_num}:\n"
                f"Input {example_num}: {example}\n"
                f"Category {example_num}: {cls.name}\n"
            )
            example_num += 1

    # Construct classification input portion of the prompt
    message_to_classify = messages[-1]['message']
    new_input = f'Input {example_num+1}: {message_to_classify}\nCategory {example_num+1}: '

    # Full prompt for GPT
    prompt = instruction + few_shot_examples + new_input
    
    # Get predicted class name from GPT
    predicted_class_name = format_detection_response(prompt_gpt_azure(prompt, 16, 1)).strip()
    
    # Print the generated prompt and response for debugging
    print(prompt)
    print("Predicted Class: " + predicted_class_name)
    print("-------------------")

    # Match predicted class name with available classes
    for cls in classes:
        if predicted_class_name.casefold() == cls.name.casefold():
            return cls
    
    # if no match found, return previous 

    return dialogue_tree.get_parent_component(dialogue_tree.get_parent_component(dc))
    # If no match found, raise an exception
    raise Exception("No matching detection class found")

# Build generation prompt and perform GPT call to generate a chatbot response based on prior messages and examples
def perform_generation(gc: Generation, messages: list, comment: str, general_context: str, dialogue_tree):
    # Construct the instruction prompt
    prompt = (
        f"The student sees a cyberbully on social media. The bully's name is Leslie and the victim's name is Alex. "
        "You are talking to that student whose name is not Alex or Leslie, so don't call him/her Alex or Leslie. "
        f"You will teach that student to stand up against cyberbullying. If possible, convince them to intervene through a public comment and not a private message. based on the following examples:\n"
    )

    # Get context examples and response examples
    context_examples = dialogue_tree.get_parent_component(gc).examples
    response_examples = gc.get_examples()

    # Limit the number of context examples to the number of response examples
    context_examples = context_examples[:len(response_examples)]

    # Build the examples section of the prompt
    for example_num, (context, response) in enumerate(itertools.zip_longest(context_examples, response_examples, fillvalue="")):
        prompt += f"Example {example_num}:\nContext: {context.example if context else ''}\nResponse: {response.response if response else ''}\n"
    
    # Add the new message context and request for the response
    message_to_answer = messages[-1]['message']
    
    if (comment != ""):
        prompt += f"The student currently plans to leave this comment on the post: '{comment}'.\nNow fill in a new response based on the examples, and provide feedback on the comment. Remember not to call the student Alex or Leslie.\nGive answers very similar to the examples:\nContext: {message_to_answer}\nResponse: "
    else: 
        prompt += f"Now fill in a new response based on the examples, remember not to call the student Alex or Leslie. \nMake sure your answer is not too similar to your previous answer. Give answers similar to the examples.:\nContext: {message_to_answer}\nResponse: "
        

    # Call GPT API to generate the response
    gpt_answer = prompt_gpt_azure(prompt, 1000, 1).strip()

    # Print the generated prompt and response for debugging
    print(prompt)
    print(f"GPT answer: {gpt_answer}")
    print("-------------------")
    
    return gpt_answer

# Starting at component c in its respective dialogue tree, process the input messages appropriately. 
# Return chatbot responses from generation components as a list
# and the next component in the tree as an id (or "exit" if leaf node is reached).
# Recursively processes user input through a dialogue tree:
# 1. Detects user intent.
# 2. Classifies messages.
# 3. Generates responses. 
# 4. Logs chatbot responses.
def traverse_dialogue_tree(c: Component, messages: list, comment: str, general_context: str, dialogue_tree: DialogueTree, responses=None, first_detection=True):
    # base cases:
    # 1) current component is a generation component and a leaf node
    #    - do last generation call
    #    - return responses and 'exit'
    # 2) current component is a detection component and a leaf node
    #    - ignore classifier call since there are no generation components to go to
    #    - return responses and 'exit'
    #    - with complete tree, should not reach this base case
    # 3) current component is a detection component and is not the first detection component in API call
    #    - return responses and c.id
    if isinstance(c, Generation) and c.is_leaf():
        response = perform_generation(c, messages, comment, general_context, dialogue_tree)
        if responses is None:
            responses = [response]
        else:
            responses.append(response)
        return responses, c.id # instead of returning "exit", we return the generation component so that future conversation steps will still use this
    elif isinstance(c, Detection) and c.is_leaf():
        if responses is None:
            responses = []
        return responses, dialogue_tree.get_parent_component(c) # instead of returning "exit", we return the generation component so that future conversation steps will still use this
    elif isinstance(c, Detection) and not first_detection:
        return responses, c.id

    # recursive cases:
    # 1) current component is detection component
    #    - classify most recent student message in messages
    #    - use classification result to go to the correct generation component
    # 2) current component is a generation component
    #    - generate response using current component and messages
    #    - add response to messages and responses
    #    - go to next component in tree
    if isinstance(c, Detection):
        det_class = perform_detection(c, messages, dialogue_tree)
        
        if not det_class.has_next_component():
            return [], "exit"
        
        next_c = det_class.get_next_component()
        to_be_logged = {'detection class id':c.id}
        dir_name = './data'
        log_file_name = f'./data/logfile_{dialogue_tree.id}.txt'

        if not os.path.exists(dir_name):
            os.makedirs(dir_name)

        if not os.path.exists(log_file_name):
            open(log_file_name, 'w').close()

        with open(log_file_name, 'a') as log_file:
            log_file.write(json.dumps(to_be_logged) + "\n")
        if next_c is not None:
            return traverse_dialogue_tree(next_c, messages, comment, general_context, dialogue_tree, responses, False)
        else:
            raise Exception(f'no edge found from {c.id} to generation component with class {det_class}')
    elif isinstance(c, Generation):
        response = perform_generation(c, messages, comment, general_context, dialogue_tree)
        if responses is None:
            responses = [response]
        else:
            responses.append(response)
        messages.append({'role': 'chatbot', 'message': response})
        to_be_logged={'role': 'chatbot', 'message': response,'timestamp': str(datetime.now()), 'current_comment': comment}
        dir_name = './data'
        log_file_name = f'./data/logfile_{dialogue_tree.id}.txt'

        if not os.path.exists(dir_name):
            os.makedirs(dir_name)

        if not os.path.exists(log_file_name):
            open(log_file_name, 'w').close()

        with open(log_file_name, 'a') as log_file:
            log_file.write(json.dumps(to_be_logged) + "\n")
        next_c = c.get_next_component()
        print(type(next_c))
        return traverse_dialogue_tree(next_c, messages, comment, general_context, dialogue_tree, responses, first_detection)
    else:
        raise Exception(f"Traversal should not end up in component {c} of type {type(c)}.")
