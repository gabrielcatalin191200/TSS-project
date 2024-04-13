const { StatusCodes } = require("http-status-codes");
const CustomAPIError = require("./custom-api");

class UnauthorizedError extends CustomAPIError {
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = StatusCodes.FORBIDDEN;
	}
}

module.exports = UnauthorizedError;
