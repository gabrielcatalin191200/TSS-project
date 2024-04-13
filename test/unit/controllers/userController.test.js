const rewire = require('rewire');
const sinon = require('sinon');
const { expect, use } = require('chai');
const { StatusCodes } = require('http-status-codes');

const User = require('../../../models/User');
const handler = rewire('../../../controllers/userController.js');

const createMockReqRes = (body = {}, params = {}, user = {}) => {
    return {
        req: {
            body,
            params,
            user: user
        },
        res: {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        }
    };
};

handler.__set__('createTokenUser', sinon.stub());
handler.__set__('attachCookiesToResponse', sinon.stub());
handler.__set__('checkPermissions', sinon.stub());


describe("userController", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe("@getAllUsers", () => {
        let findStub;

        beforeEach(() => {
            findStub = sinon.stub(User, 'find');
        });

        it('should return all users with role user', async () => {
            const { req, res } = createMockReqRes();
            const users = [{ name: 'user1' }, { name: 'user2' }];
            findStub.returns({
                select: sinon.stub().returns(users),
            });

            await handler.getAllUsers(req, res);

            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ users })).to.be.true;
        });
    });


    describe("@getSingleUser", () => {
        let findOneStub;

        beforeEach(() => {
            findOneStub = sinon.stub(User, 'findOne');
        });

        it('should throw NotFoundError if no user is found', async () => {
            const { req, res } = createMockReqRes();
            findOneStub.returns({
                select: sinon.stub().returns(null),
            });

            try {
                await handler.getSingleUser(req, res);
            } catch (error) {
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal('No user with id: undefined');
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });

        it('should return user if found', async () => {
            const { req, res } = createMockReqRes({}, { id: '507f1f77bcf86cd799439011' }, { userId: '507f1f77bcf86cd799439012' });
            const user = { name: 'user1' };
            findOneStub.returns({
                select: sinon.stub().returns(user),
            });

            await handler.getSingleUser(req, res);

            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ user })).to.be.true;
        });
    });


    describe("@showCurrentUser", () => {
        it('should return current user', async () => {
            const { req, res } = createMockReqRes();
            const user = { name: 'user1' };
            req.user = user;
            
            await handler.showCurrentUser(req, res);

            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ user })).to.be.true;

        });
    });


    describe("@updateUser", () => {
        let findOneStub, saveStub;

        beforeEach(() => {
            findOneStub = sinon.stub(User, 'findOne');
            saveStub = sinon.stub();
        });

        it('should throw BadRequestError if email or name is missing', async () => {
            const { req, res } = createMockReqRes({ email: undefined, name: 'test' });
            findOneStub.returns({
                select: sinon.stub().returns({ email: 'test@mock.com', name: 'test' }),
            });

            try {
                await handler.updateUser(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Please provide all values');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });

        it('should update user with email and name', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', name: 'test' });
            findOneStub.returns({
                select: sinon.stub().returns({ email: 'test@mock.com', name: 'test' }),
                save: saveStub,
            });

            await handler.updateUser(req, res);

            expect(saveStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });


    describe("@updateUserPassword", () => {
        let findOneStub, comparePasswordStub, saveStub;

        beforeEach(() => {
            findOneStub = sinon.stub(User, 'findOne');
            comparePasswordStub = sinon.stub();
            saveStub = sinon.stub();
        });

        it('should throw BadRequestError if oldPassword or newPassword is missing', async () => {
            const { req, res } = createMockReqRes({ oldPassword: undefined, newPassword: 'test' });
            findOneStub.returns({
                select: sinon.stub().returns({ email: 'test@mock.com', name: 'test' }),
            });

            try {
                await handler.updateUserPassword(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Please provide both values');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });

        it('should throw UnauthenticatedError if oldPassword is incorrect', async () => {
            const { req, res } = createMockReqRes({ oldPassword: 'wrong', newPassword: 'test' });
            findOneStub.returns({
                select: sinon.stub().returns({ email: 'test@mock.com', name: 'test' }),
                comparePassword: comparePasswordStub,
            });

            comparePasswordStub.returns(false);

            try {
                await handler.updateUserPassword(req, res);
            } catch (error) {
                expect(error.name).to.equal('UnauthenticatedError');
                expect(error.message).to.equal('Invalid Credentials');
                expect(error.statusCode).to.equal(StatusCodes.UNAUTHORIZED);
            }
        });

        it('should update user password', async () => {
            const { req, res } = createMockReqRes({ oldPassword: 'test', newPassword: 'test' });
            findOneStub.returns({
                select: sinon.stub().returns({ email: 'test@mock.com', name: 'test' }),
                comparePassword: comparePasswordStub,
                save: saveStub,
            });

            comparePasswordStub.returns(true);

            await handler.updateUserPassword(req, res);

            expect(saveStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    })
});