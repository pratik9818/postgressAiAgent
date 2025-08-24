export default {
  type: "function",
  function: {
    name: "run_postgres_query",
    description: "Run a SQL query on the PostgreSQL database.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL query to run on the database",
        },
      },
      required: ["query"],
    },
  },
};
