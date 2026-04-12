const { body, validationResult } = require("express-validator");

const createTaskValidationRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be text"),

  body("status")
    .optional()
    .isIn(["todo", "in-progress", "done"])
    .withMessage("Status must be todo, in-progress, or done"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  next();
};

module.exports = {
  createTaskValidationRules,
  validate,
};