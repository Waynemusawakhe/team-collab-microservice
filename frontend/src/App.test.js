import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders authentication screen", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      name: /secure team collaboration platform/i,
    })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
});
