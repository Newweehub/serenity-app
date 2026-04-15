const { chat } = require("./backend/services/llm");

async function test() {
  const reply = await chat(
    "You are a warm, supportive mindfulness coach.",
    "I am feeling a bit anxious today."
  );
  console.log("GPT-4.1 mini reply:", reply);
}

test().catch(console.error);