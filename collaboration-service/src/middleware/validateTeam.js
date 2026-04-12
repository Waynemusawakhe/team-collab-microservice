const { body, validationResult } = require("express-validator");

const createTeamValidationRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Team name is required"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be text"),
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
  createTeamValidationRules,
  validate,
};
