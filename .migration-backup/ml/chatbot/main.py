# main.py
from chatbot.bot import Bot
from chatbot.responder import ResponseFormatter
def main():
    """
    Run the chatbot in interactive CLI mode.
    Loads knowledge base from Supabase.
    """
    print("\n" + "=" * 70)
    print("  XMUMC Campus Assistant — Interactive Mode (Supabase)")
    print("=" * 70)
    print("Type your questions. Type 'quit' or 'exit' to stop.\n")
    
    bot = Bot()
    
    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ["quit", "exit", "bye"]:
            print("Chatbot: Goodbye!")
            break
        response = bot.process_message(user_input, debug=True)
        print(ResponseFormatter._to_console(response))
        print()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f" Error: {e}")
        print(f"Make sure .env file has SUPABASE_URL and SUPABASE_ANON_KEY")
        import sys
        sys.exit(1)