export default {
  type: "function",
  function: {
    name: "read_query",
    description: "generate sql queries bases on user query and tables name",
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
