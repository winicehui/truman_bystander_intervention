# This code defines a framework for simulating different student behaviors in response to cyberbullying scenarios on Instagram.
from helpers import prompt_chatgpt_azure


# We can have different types of students. 
# Their difference is defined by descriptions and part of the prompt instructions.
class StudentType:
    def __init__(self, description, comment_prompt, chat_prompt):
        self.description = description # A general description of the student
        self.comment_prompt = comment_prompt # Used as part of the prompt for generating the comment under the instagram post
        self.chat_prompt = chat_prompt # Used as part of the prompt for generating the comment of the chat
        
BullyTheBullyStudent = StudentType("an aggressive student",
                                   "in which John insults the bully. Be aggressive",
                                   "where you tend to not agree with the chatbot")
SupportTheVictimStudent = StudentType("a supportive student",
                                   "in which John comforts and supports Alex (the victim). Be gentle and sweet",
                                   "where you tend to agree with the chatbot")
StupidStudent = StudentType("a student who ignores the bullying and just comments on the original post",
                                   "in which John is looking forward to seeing the ballet recital.",
                                   "where you tend to agree with the chatbot")

# Generates responses for a given StudentType
# Constructs a prompt describing the context (an Instagram post or a chat about bullying).
def perform_gpt_student(student_type, messages, comment, general_context, output_type):
    system_description = f"You are John, {student_type.description}"
    prompt = f"{system_description} and you see the following on Instagram: \n{general_context}\n"
    
    if output_type == "comment":
        prompt += f"Give a comment that the student John would post under the Instagram post {student_type.comment_prompt}. Answer in the language style of a teenager. Give an answer that is no longer than 10 words."
    
    elif output_type == "chat":
        prompt += f"You are planning to leave following comment {comment} under the Instagram post. Based on your comment, a chatbot is "
        prompt += "trying to teach you how to best act with a cyberbullying situation. This is your conversation so far: \n"
        
        for message_entry in messages:
            message = message_entry['message']
            role = message_entry['role']
            prompt += f"{role}: {message}\n"
        
        prompt += f"Give the next answer of the student to this conversation {student_type.chat_prompt}. Answer in the language style of a teenager. Give an answer that is no longer than 10 words.\nJohn: "
    
    else:
        raise Exception(f"Output type {output_type} not supported.")
    
    temperature = 1
    
    # Call the Azure OpenAI API to get the response
    gpt_output = prompt_chatgpt_azure(system_description, prompt, 1000, temperature)
    # Clean up the output
    gpt_output = gpt_output.replace("\"", "") # GPT tends to add " at the beginning and end, remove these
    gpt_output = gpt_output.replace("John:", "") # GPT tends to add a John: at the beginning
    gpt_output = gpt_output.strip()

    # Print the generated prompt and response for debugging
    print(prompt)
    print(gpt_output)
    print("-------------------")
    
    return gpt_output