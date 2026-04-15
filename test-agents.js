const { route } = require("./backend/agents/orchestrator");

const TEST_USER = "test-user-001";

async function runTests() {
  console.log("\n--- Test 1: Anxious morning ---");
  const t1 = await route(TEST_USER, "I feel really anxious today", "anxious");
  console.log(`Agent: ${t1.agent}`);
  console.log(`Response: ${t1.response.content || t1.response.reflection}\n`);

  console.log("--- Test 2: Want to journal ---");
  const t2 = await route(TEST_USER, "I want to write about my day");
  console.log(`Agent: ${t2.agent}`);
  console.log(`Response: ${t2.response.content}\n`);

  console.log("--- Test 3: Habit check ---");
  const t3 = await route(TEST_USER, "I missed my breathing habit today");
  console.log(`Agent: ${t3.agent}`);
  console.log(`Response: ${t3.response.content}\n`);

  console.log("--- Test 4: Weekly insights ---");
  const t4 = await route(TEST_USER, "Show me my week summary");
  console.log(`Agent: ${t4.agent}`);
  console.log(`Response: ${t4.response.reflection || t4.response.content}\n`);
}

runTests().catch(console.error);