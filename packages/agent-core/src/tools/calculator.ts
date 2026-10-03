import { tool } from "@strands-agents/sdk";
import { z } from "zod";

const expressionSchema = z
  .string()
  .min(1)
  .describe("Arithmetic expression using digits, +, -, *, /, parentheses, and decimal points");

function evaluateExpression(expr: string): number {
  const sanitized = expr.replace(/\s/g, "");
  if (!/^[\d+\-*/().]+$/.test(sanitized)) {
    throw new Error("Expression contains invalid characters");
  }

  const result = Function(`"use strict"; return (${sanitized})`)() as unknown;
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Invalid expression result");
  }
  return result;
}

export const calculatorTool = tool({
  name: "calculator",
  description: "Evaluates a basic arithmetic expression and returns the numeric result",
  inputSchema: z.object({ expression: expressionSchema }),
  callback: async (input) => {
    const value = evaluateExpression(input.expression);
    return String(value);
  },
});
