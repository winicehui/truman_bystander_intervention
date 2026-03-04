from __future__ import annotations
import os
import pickle
from typing import List, Any, Optional

class DialogueTree():
    def __init__(self, name: str):
        self.id = DialogueTree.generate_dialogue_id()
        self.name = name
        self.components = []
        self.welcome_message = ""
        self.chatbot_name = "default"
        self.persona = "The student sees a cyberbully on social media and makes a comment in response to the bully.  Teach students to counteract cyberbullies based on the following examples:"
        self.user_type = "Student"
        self.temperature = "1"
        self.participant_id="-1"
        self.timestamp="00:00:00"

    def to_string(self):
        print("logging from model.py....")
        print("chabot name: "+self.chatbot_name)
        print("welcome message"+self.welcome_message)
        print("persona"+self.persona)
        print("user_type"+self.user_type)
        print("temperature"+self.temperature)
        print("participant_id" + self.participant_id)
        print("timestamp" + self.timestamp)

    # Return a unique dialogue tree id of the form dt-{number}
    @staticmethod
    def generate_dialogue_id():
        if not os.path.exists('data'):
            os.mkdir('data')

        max_id_num = -1
        for filename in os.listdir('data'):
            id_num = int(filename[filename.index('-') + 1:filename.index('.')])
            max_id_num = max(id_num, max_id_num)
        return f'dt-{max_id_num + 1}'

    # Check if a component id already exists
    def component_id_exists(self, component_id: str):
        for component in self.components:
            if component.id == component_id:
                return True
        return False

    # Load dialogue tree from data directory
    @staticmethod
    def load(id: str) -> DialogueTree:
        with open(f'data/{id}.pkl', 'rb') as file:
            dt = pickle.load(file)
        return dt

    # Save dialogue tree to data directory
    def save(self):
        with open(f'data/{self.id}.pkl', 'wb') as file:
            pickle.dump(self, file)

    # Delete dialogue tree from data directory
    def delete(self):
        os.remove(f'data/{self.id}.pkl')

    # Return component with id if it exists, None otherwise
    def get_component(self, id: str) -> Optional[Component]:
        for component in self.components:
            if component.id == id:
                return component
        return None

    # Return list of component ids for every component in dialogue tree
    def get_component_ids(self):
        component_ids = []
        for component in self.components:
            component_ids.append(component.id)
        return component_ids

    def get_chatbot_name(self):
        return self.chatbotName

    # Return list of edges for every edge in the dialogue tree. Each edge is represented
    # as {"start": "id", "end": "id"}
    def get_edges(self):
        edges = []
        for component in self.components:
            for child in component.children:
                edge = {'start': component.id, 'end': child.id}
                edges.append(edge)
        return edges

    # Add component to dialogue tree and return its id
    def add_component(self, id: str, component_type: str, name: str):
        if component_type == "gc":
            component = Generation(id, name)
        elif component_type == "dc":
            component = Detection(id, name)
        elif component_type == "dcls":
            component = DetectionClass(id, name)
        else:
            raise Exception(f"Invalid component type {component_type}")

        self.components.append(component)

    # Add directed edge between components
    def add_edge(self, start_id: str, end_id: str):
        start_component = self.get_component(start_id)
        end_component = self.get_component(end_id)
        #end_component.set_parent(start_id)
        start_component.children.append(end_component)

    # Delete component and any edges connected to it
    def delete_component(self, id: str):
        component = self.get_component(id)
        for edge in self.get_edges():
            if component.id == edge['end']:
                self.delete_edge(edge['start'], edge['end'])
        self.components.remove(component)

    # Delete directed edge between components with ids start_id and end_id
    def delete_edge(self, start_id: str, end_id: str):
        start_component = self.get_component(start_id)
        end_component = self.get_component(end_id)
        start_component.children.remove(end_component)

    def get_parent_component(self, component: Component):
        for edge in self.get_edges():
            if component.id == edge['end']:
                return self.get_component(edge['start'])


    # Return a JSON representation for a dialogue tree
    def to_json(self):
        result = {}
        result['id'] = self.id
        result['name'] = self.name
        result['welcome_message'] = self.welcome_message
        result['chatbot_name'] = self.chatbot_name
        result['persona'] = self.persona
        result['user_type'] = self.user_type
        result['temperature'] = self.temperature
        result['participant_id'] = self.participant_id
        result['timestamp'] = self.timestamp

        if not self.components:
            result['components'] = []
        else:
            result['components'] = self.get_component_ids()

        if not self.get_edges():
            result['edges'] = []
        else:
            result['edges'] = self.get_edges()

        return result

class Component:
    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name
        self.parent_id = 0
        self.children = []

    # Return True if component is a leaf in the tree, False otherwise
    def is_leaf(self):
        return self.children == []

    def set_parent(parent_id: str):
        self.parent_id = parent_id

    def get_parent(self):
        return parent_id

    def to_json(self) -> dict[str, Any]:
        return {'id': self.id, 'name': self.name}

class Generation(Component):
    def __init__(self, id: str, name: str):
        super().__init__(id, name)
        self.examples = []

    # Return a unique example id of the form ex-{number}
    def generate_example_id(self):
        max_id_num = -1
        for example in self.examples:
            id_num = int(example.id.split('-')[1])
            max_id_num = max(id_num, max_id_num)
        return f'ex-{max_id_num + 1}'

    # Return example with id if it exists, None otherwise
    def get_example(self, id: str):
        for example in self.examples:
            if example.id == id:
                return example
        return None

    # Return a list of examples to be used in generation prompt
    def get_examples(self):
        return self.examples

    # Return component on the outgoing edge from this generation component
    def get_next_component(self):
        return self.children[0]

    # Add example to generation component, where example
    # consists of context and response, and return its id
    def add_example(self, context: str, response: str):
        id = self.generate_example_id()
        new_example = self.GenerationExample(id, context, response)
        self.examples.append(new_example)
        return id

    # Delete example with id from examples
    def delete_example(self, id: str):
        example = self.get_example(id)
        self.examples.remove(example)

    # Return a JSON representation for a generation component
    def to_json(self):
        result = super().to_json()

        if not self.examples:
            result['examples'] = []
        else:
            examples = []
            for example in self.examples:
                examples.append({'id': example.id,
                                 'context': example.context,
                                 'response': example.response})
            result['examples'] = examples

        return result

    class GenerationExample:
        def __init__(self, id: str, context: str, response: str):
            self.id = id
            self.context = context
            self.response = response

        # Edit context and/or response of example
        def edit_example(self, context: str or None, response: str or None):
            if context is not None:
                self.context = context
            if response is not None:
                self.response = response

class Detection(Component):
    def __init__(self, id: str, name: str):
        super().__init__(id, name)

    def get_classes(self) -> List[DetectionClass]:
        return self.children

    # Return a JSON representation for a detection component
    def to_json(self):
        result = super().to_json()

        if not self.children:
            result['classes'] = []
        else:
            classes = []
            for cls in self.children:
                classes.append({'id': cls.id,
                                'class_name': cls.name})
            result['classes'] = classes

        return result

class DetectionClass(Component):
    def __init__(self, id: str, class_name: str):
        super().__init__(id, class_name)
        self.id = id
        self.examples = []

    def has_next_component(self):
        return len(self.children) > 0

    # Return component on the outgoing edge from this detection class component
    def get_next_component(self):
        return self.children[0]

    # Return a unique example id of the form ex-{number}
    def generate_example_id(self):
        max_id_num = -1
        for example in self.examples:
            id_num = int(example.id.split('-')[1])
            max_id_num = max(id_num, max_id_num)
        return f'ex-{max_id_num + 1}'

    # Return DetectionExample with id if it exists, None otherwise
    def get_example(self, id: str):
        for example in self.examples:
            if example.id == id:
                return example
        return None

    # Return list of examples in detection class
    def get_examples(self):
        lst = []
        for detection_example in self.examples:
            lst.append(detection_example.example)
        return lst

    # Add new example to detection class and return its id
    def add_example(self, example: str):
        id = self.generate_example_id()
        new_example = self.DetectionExample(id, example)
        self.examples.append(new_example)
        return id

    # Delete example with id from examples
    def delete_example(self, id: str):
        example = self.get_example(id)
        self.examples.remove(example)

    # Return a JSON representation for a detection class
    def to_json(self):
        result = super().to_json()

        if self.examples == []:
            result['examples'] = []
        else:
            examples = []
            for example in self.examples:
                examples.append({'id': example.id,
                                 'example': example.example})
            result['examples'] = examples

        return result
    class DetectionExample:
        def __init__(self, id: str, example: str):
            self.id = id
            self.example = example