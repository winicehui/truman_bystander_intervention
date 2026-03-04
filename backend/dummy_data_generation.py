""" Generates a dummy dialogue tree to test the backend server """
import requests

base_url = "http://localhost:5000/dialogue"

def make_request(url_postfix, json_data):
    response = requests.post(f"{base_url}{url_postfix}", json=json_data)
    print(response.text)
    json_response = response.json()
    if json_response["success"]:
        if "data" in json_response:
            return json_response["data"]
        return None
    else:
        raise Exception(json_response)

# create a new dialogue tree
did = make_request("", {"name": "dummy dialogue","welcome_message":"test_welcome"
        ,"chatbot_name": 'test_chatbot_name',
        "persona": "testing_persona",
        "user_type":"testing_user_type",
        "temperature":"testing_tempreature",
        "participant_id": "testing_participant_id",
        "timestamp": "testing_timestamp"
                        })["id"]

# create first detection component
make_request(f"/{did}/detection", {"id": "dc-1", "name": "classify initial user input"})

# create detection-class components for parent detection component
make_request(f"/{did}/detection_class", {"id": "dcls-1", "name": "user bullies the bully"})
make_request(f"/{did}/detection_class", {"id": "dcls-2", "name": "user defends the target"})

# create generation components
make_request(f"/{did}/generation", {"id": "gc-1", "name": "ask user if they think bullying is helpful"})
make_request(f"/{did}/generation", {"id": "gc-2", "name": "congratulate user for upstanding against bullying"})
make_request(f"/{did}/generation", {"id": "gc-3", "name": "tell user they can continue with the next exercise"})

# add edges
make_request(f"/{did}/edge", {"start": "dc-1", "end": "dcls-1"})
make_request(f"/{did}/edge", {"start": "dc-1", "end": "dcls-2"})
make_request(f"/{did}/edge", {"start": "dcls-1", "end": "gc-1"})
make_request(f"/{did}/edge", {"start": "dcls-2", "end": "gc-2"})
make_request(f"/{did}/edge", {"start": "gc-2", "end": "gc-3"})

# add detection-class examples
make_request(f"/{did}/detection_class/dcls-1/example", {"example": "Bully: Tom, Victim: Zoe, Student: Josh, Comment: Tom is super annoying!"})
make_request(f"/{did}/detection_class/dcls-1/example", {"example": "Bully: Karl, Victim: Tom, Student: Victoria, Comment: I hate Karl"})
make_request(f"/{did}/detection_class/dcls-1/example", {"example": "Bully: Isabel, Victim: Maria, Student: Anne, Comment: Just shut up, Isabel"})

make_request(f"/{did}/detection_class/dcls-2/example", {"example": "Bully: Tom, Victim: Zoe, Student: Josh, Comment: Zoe is actually a great person."})
make_request(f"/{did}/detection_class/dcls-2/example", {"example": "Bully: Karl, Victim: Tom, Student: Victoria, Comment: Don't listen to Karl. Tom is amazing."})
make_request(f"/{did}/detection_class/dcls-2/example", {"example": "Bully: Isabel, Victim: Maria, Student: Anne, Comment: Maria, I'm on your side."})

# add generation example
make_request(f"/{did}/generation/gc-1/example", {"context": "Bully: Tom, Victim: Zoe, Student: Josh, Comment: Tom is super annoying!",
                                                 "response": "Do you think it is helpful that you are insulting Tom?"})
make_request(f"/{did}/generation/gc-1/example", {"context": "Bully: Karl, Victim: Tom, Student: Victoria, Comment: I hate Karl",
                                                 "response": "While emotions might run high, do you think it is helpful that you are so aggressive towards Karl?"})
make_request(f"/{did}/generation/gc-1/example", {"context": "Bully: Isabel, Victim: Maria, Student: Anne, Comment: Just shut up, Isabel",
                                                 "response": "Do you think this negative tone is a good way to interact with Isabel?"})

make_request(f"/{did}/generation/gc-2/example", {"context": "Bully: Tom, Victim: Zoe, Student: Josh, Comment: Zoe is actually a great person.",
                                                 "response": "It is great that you are standing up for Zoe!"})
make_request(f"/{did}/generation/gc-2/example", {"context": "Bully: Karl, Victim: Tom, Student: Victoria, Comment: Don't listen to Karl. Tom is amazing.",
                                                 "response": "That was a good way to response to Karl by supporting Tom!"})
make_request(f"/{did}/generation/gc-2/example", {"context": "Bully: Isabel, Victim: Maria, Student: Anne, Comment: Maria, I'm on your side.",
                                                 "response": "Well done. Supporting Maria in this situation is very helpful."})

make_request(f"/{did}/generation/gc-3/example", {"context": "Bully: Tom, Victim: Zoe, Student: Josh, Comment: Zoe is actually a great person.",
                                                 "response": "You completed this exercise successfully, Josh!"})
make_request(f"/{did}/generation/gc-3/example", {"context": "Bully: Karl, Victim: Tom, Student: Victoria, Comment: Don't listen to Karl. Tom is amazing.",
                                                 "response": "Well done, Victoria! You can now go to the next exercise."})
make_request(f"/{did}/generation/gc-3/example", {"context": "Bully: Isabel, Victim: Maria, Student: Anne, Comment: Maria, I'm on your side.",
                                                 "response": "After this successful exercise, you can now start with the next one, Anne."})

