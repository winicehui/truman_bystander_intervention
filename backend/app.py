# This code defines a Flask-based API that manages dialogue trees and their associated components, 
# such as generation components and detection components. 
# It provides multiple endpoints to create, retrieve, update, and delete different components.
from flask import Flask, request
from flask_cors import CORS, cross_origin
from helpers import *
from models import *
from validation import *
import gptstudent

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

# Creates a new dialogue tree
@app.route('/dialogue', methods=['POST'])
@cross_origin()
@require_secret
def create_dialogue():
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_create_dialogue(request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    name = request_data['name']
    # create new dialogue tree
    dt = DialogueTree(name)
    dt.save()
    return success_response(201, {'id': dt.id})

# Retrieves a dialogue tree
@app.route('/dialogue/<dt_id>', methods=['GET'])
@cross_origin()
@require_secret
def get_dialogue(dt_id):
    error_msg, status_code = validate_get_dialogue(dt_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # return JSON representation of dialogue tree
    dt = DialogueTree.load(dt_id)
    return success_response(200, dt.to_json())

# Deletes a dialogue tree
@app.route('/dialogue/<dt_id>', methods=['DELETE'])
@cross_origin()
@require_secret
def delete_dialogue(dt_id):
    if not validate_dialogue_exists(dt_id):
        return failure_response(404, 'provided dialogue tree does not exist')

    # delete dialogue tree
    DialogueTree.load(dt_id).delete()
    return success_response(200)

# Renames a dialogue tree
@app.route('/dialogue/<dt_id>/name', methods=['PUT'])
@cross_origin()
@require_secret
def edit_dialogue_name(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_edit_dialogue_name(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    name = request_data['name']

    # Edit dialogue tree name
    dt = DialogueTree.load(dt_id)
    dt.name = name
    dt.save()
    return success_response(200)

# Adds an edge (connection) between dialogue components
@app.route('/dialogue/<dt_id>/edge', methods=['POST'])
@cross_origin()
@require_secret
def add_dialogue_edge(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_dialogue_edge(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    start_id = request_data['start']
    end_id = request_data['end']

    # add edge to dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.add_edge(start_id, end_id)
    dt.save()
    return success_response(201)

# Removes an edge (connection) between dialogue components
@app.route('/dialogue/<dt_id>/edge', methods=['DELETE'])
@cross_origin()
@require_secret
def delete_dialogue_edge(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_delete_dialogue_edge(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    start_id = request_data['start']
    end_id = request_data['end']

    # delete edge from dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.delete_edge(start_id, end_id)
    dt.save()
    return success_response(200)

# ================================================================================================================

# Updates chatbot metadata (e.g. name, welcome message, persona, etc.)
@app.route('/dialogue/<dt_id>/chatbot_fields', methods=['PUT'])
@cross_origin()
@require_secret
def set_chatbot_fields(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_set_chatbot_fields(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    dt = DialogueTree.load(dt_id)
    dt.chatbot_name = request_data['chatbot_name']
    dt.welcome_message = request_data['welcome_message']
    dt.persona = request_data['persona']
    dt.user_type = request_data['user_type']
    dt.temperature = request_data['temperature']
    dt.participant_id = request_data['participant_id']
    dt.timestamp = request_data['timestamp']
    dt.save()
    return success_response(200)

# Retrieves chatbot metadata (e.g. name, welcome message, persona, etc.)
@app.route('/dialogue/<dt_id>/chatbot_fields', methods=['GET'])
@cross_origin()
@require_secret
def get_chatbot_fields(dt_id):
    error_msg, status_code = validate_get_dialogue(dt_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    dt = DialogueTree.load(dt_id)
    return success_response(200, {'chatbot_name': dt.chatbot_name,"welcome_message":dt.welcome_message,"persona":dt.persona,"user_type":dt.user_type,"temperature":dt.temperature,"participant_id":dt.participant_id,"timestamp":dt.timestamp})

# ===============================================================================================================

# Adds a generation component to the dialogue tree
@app.route('/dialogue/<dt_id>/generation', methods=['POST'])
@cross_origin()
@require_secret
def add_generation(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_generation(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    id = request_data['id']
    name = request_data['name']

    # add generation component to dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.add_component(id, 'gc', name)
    dt.save()
    return success_response(201)

# Retrieves a generation component from the dialogue tree
@app.route('/dialogue/<dt_id>/generation/<gc_id>', methods=['GET'])
@cross_origin()
@require_secret
def get_generation(dt_id, gc_id):
    error_msg, status_code = validate_get_generation(dt_id, gc_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # return JSON representation of generation component
    gc = DialogueTree.load(dt_id).get_component(gc_id)
    return success_response(200, gc.to_json())

# Deletes a generation component from the dialogue tree
@app.route('/dialogue/<dt_id>/generation/<gc_id>', methods=['DELETE'])
@cross_origin()
@require_secret
def delete_generation(dt_id, gc_id):
    error_msg, status_code = validate_delete_generation(dt_id, gc_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # delete generation component from dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.delete_component(gc_id)
    dt.save()
    return success_response(200)

# Renames a generation component in the dialogue tree
@app.route('/dialogue/<dt_id>/generation/<gc_id>/name', methods=['PUT'])
@cross_origin()
@require_secret
def edit_generation_name(dt_id, gc_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_edit_generation_name(dt_id, gc_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    name = request_data['name']

    # edit generation component name
    dt = DialogueTree.load(dt_id)
    dt.get_component(gc_id).name = name
    dt.save()
    return success_response(200)

# Adds an example to a generation component
@app.route('/dialogue/<dt_id>/generation/<gc_id>/example', methods=['POST'])
@cross_origin()
@require_secret
def add_generation_example(dt_id, gc_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_generation_example(dt_id, gc_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    context = request_data['context']
    response = request_data['response']

    # add example to generation component
    dt = DialogueTree.load(dt_id)
    ex_id = dt.get_component(gc_id).add_example(context, response)
    dt.save()
    return success_response(201, {'id': ex_id})

# Deletes an example from a generation component
@app.route('/dialogue/<dt_id>/generation/<gc_id>/example/<ex_id>', methods=['DELETE'])
@cross_origin()
@require_secret
def delete_generation_example(dt_id, gc_id, ex_id):
    error_msg, status_code = validate_delete_generation_example(dt_id, gc_id, ex_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # delete example from generation component
    dt = DialogueTree.load(dt_id)
    dt.get_component(gc_id).delete_example(ex_id)
    dt.save()
    return success_response(200)

# Edits an existing example in a generation component
@app.route('/dialogue/<dt_id>/generation/<gc_id>/example/<ex_id>', methods=['PUT'])
@cross_origin()
@require_secret
def edit_generation_example(dt_id, gc_id, ex_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_edit_generation_example(dt_id, gc_id, ex_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    context = request_data.get('context')
    response = request_data.get('response')

    # edit generation component example
    dt = DialogueTree.load(dt_id)
    dt.get_component(gc_id).get_example(ex_id).edit_example(context, response)
    dt.save()
    return success_response(200)

# Adds a detection component to the dialogue tree
@app.route('/dialogue/<dt_id>/detection', methods=['POST'])
@cross_origin()
@require_secret
def add_detection(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_detection(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    id = request_data['id']
    name = request_data['name']

    # add detection component to dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.add_component(id, 'dc', name)
    dt.save()
    return success_response(201)

# Retrieves a detection component from the dialogue tree
@app.route('/dialogue/<dt_id>/detection/<dc_id>', methods=['GET'])
@cross_origin()
@require_secret
def get_detection(dt_id, dc_id):
    error_msg, status_code = validate_get_detection(dt_id, dc_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # return JSON representation of detection component
    dc = DialogueTree.load(dt_id).get_component(dc_id)
    return success_response(200, dc.to_json())

# Deletes a detection component from the dialogue tree
@app.route('/dialogue/<dt_id>/detection/<dc_id>', methods=['DELETE'])
@cross_origin()
@require_secret
def delete_detection(dt_id, dc_id):
    error_msg, status_code = validate_delete_detection(dt_id, dc_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # delete detection component from dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.delete_component(dc_id)
    dt.save()
    return success_response(200)

# Renames a detection component in the dialogue tree
@app.route('/dialogue/<dt_id>/detection/<dc_id>/name', methods=['PUT'])
@cross_origin()
@require_secret
def edit_detection_name(dt_id, dc_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_edit_detection_name(dt_id, dc_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    name = request_data['name']

    # edit detection component name
    dt = DialogueTree.load(dt_id)
    dt.get_component(dc_id).name = name
    dt.save()
    return success_response(200)

# Adds a detection class to a detection component
@app.route('/dialogue/<dt_id>/detection_class', methods=['POST'])
@cross_origin()
@require_secret
def add_detection_class(dt_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_detection_class(dt_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    id = request_data['id']
    name = request_data['name']

    # add detection component to dialogue tree
    dt = DialogueTree.load(dt_id)
    dt.add_component(id, 'dcls', name)
    dt.save()
    return success_response(201)

# Retrieves a detection class from a detection component
@app.route('/dialogue/<dt_id>/detection_class/<dcls_id>', methods=['GET'])
@cross_origin()
@require_secret
def get_detection_class(dt_id, dcls_id):
    error_msg, status_code = validate_get_detection_class(dt_id, dcls_id)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    # return JSON representation of detection class
    cls = DialogueTree.load(dt_id).get_component(dcls_id)
    return success_response(200, cls.to_json())

# Adds an example to a detection component
@app.route('/dialogue/<dt_id>/detection_class/<dcls_id>/example', methods=['POST'])
@cross_origin()
@require_secret
def add_detection_class_example(dt_id, dcls_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_add_detection_class_example(dt_id, dcls_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    example = request_data['example']

    # add example to detection class
    dt = DialogueTree.load(dt_id)
    ex_id = dt.get_component(dcls_id).add_example(example)
    dt.save()
    return success_response(201, {'id': ex_id})

# ===============================================================================================================

# Calls an AI model to generate responses
@app.route('/dialogue/<dt_id>/generation/<gc_id>/prompt', methods=['POST'])
@cross_origin()
@require_secret
def prompt_generation_component(dt_id, gc_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_prompt_generation_component(dt_id, gc_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    messages = request_data['messages']

    # generate response to most recent message
    gc = DialogueTree.load(dt_id).get_component(gc_id)
    response = perform_generation(gc, messages)
    return success_response(200, {'response': response})

# Calls an AI model to classify messages
@app.route('/dialogue/<dt_id>/detection/<dc_id>/prompt', methods=['POST'])
@cross_origin()
@require_secret
def prompt_detection_component(dt_id, dc_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_prompt_detection_component(dt_id, dc_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    messages = request_data['messages']

    # classify most recent message, which should be from the student
    dc = DialogueTree.load(dt_id).get_component(dc_id)
    response = perform_detection(dc, messages)
    return success_response(200, {'response': response})

# Simulates different GPT-based student personalities
@app.route('/dialogue/gpt_student', methods=['POST'])
@cross_origin()
@require_secret
def gpt_student():
    request_data = request.get_json(silent=True)
    type=gptstudent.BullyTheBullyStudent
    if request_data["GPTStudentType"]=='2':
        type=gptstudent.SupportTheVictimStudent
    elif request_data["GPTStudentType"]=='3':
        type = gptstudent.StupidStudent
    try:
        response = gptstudent.perform_gpt_student(
                                    type,
                                    request_data["messages"],
                                    request_data["comment"],
                                    request_data["generalContext"],
                                    request_data["outputType"])
        return success_response(200, {'response': response})
    except Exception as e:
        print(e)
        return failure_response(400, e.args[0])

# Handles user interactions with the dialogue system. Logs messages into a file (logfile_<dt_id>.txt)
# Uses traverse_dialogue_tree() to determine the next step in the conversation.
# dt_id is the dialogue tree ID
# c_id is the component ID
@app.route('/dialogue/<dt_id>/chat/<c_id>', methods=['POST'])
@cross_origin()
@require_secret
def chat(dt_id, c_id):
    request_data = request.get_json(silent=True)
    error_msg, status_code = validate_chat(dt_id, c_id, request_data)
    if error_msg is not None:
        return failure_response(status_code, error_msg)

    messages = request_data['messages']
    comment = request_data['comment']
    general_context = request_data['generalContext']

    # traverse dialogue tree from component c to the next detection component
    # return next detection component's id and generation component outputs
    c = DialogueTree.load(dt_id).get_component(c_id)
    dt = DialogueTree.load(dt_id)
    
    # Find the most recent message by checking id values 
    max=-1
    new_msg={"role": "none", "message": "none"}
    for m in messages:
        if(m['id']>max):
            max=m['id']
            new_msg=m
    dir_name = './data'
    log_file_name = f'./data/logfile_{dt_id}.txt'

    # Log Messages to file
    # Create log directory ./data if it does not exist
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)

    if not os.path.exists(log_file_name):
        open(log_file_name, 'w').close()

    # Create log file logfile_<dt_id>.txt if it doesn't exist.
    # Append new messages.
    # If id == 0, logs "-----------NEW-----------" to mark a new conversation.
    with open(log_file_name, 'a') as log_file:
        if(new_msg['id']==0):
           log_file.write("-----------NEW-----------" + "\n")
        log_file.write(json.dumps(new_msg) + "\n")
    
    try:
        # Process conversation and determine the next step
        responses, next_id = traverse_dialogue_tree(c, messages, comment, general_context, dt)
        # Return response: 
        # responses: Chatbot replies
        # next_id: ID of the next dialogue component
        return success_response(200, {'responses': responses, 'next_id': next_id})
    except Exception as e:
        return failure_response(400, e.args[0])