const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');
const { StatusCodes } = require('http-status-codes');

const User = require('../../../models/User');
const handler = rewire('../../../controllers/authController.js');

const createMockReqRes = (body = {}, params = {}, user = {}) => {
    return {
        req: {
            body,
            params,
            user: user
        },
        res: {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
            cookie: sinon.stub()
        }
    };
};

handler.__set__('attachCookiesToResponse', sinon.stub());
handler.__set__('createTokenUser', sinon.stub());


describe("authController", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('@register', () => {
        let findOneStub, countDocumentsStub, createStub;

        beforeEach(() => {
            findOneStub = sinon.stub(User, 'findOne');
            countDocumentsStub = sinon.stub(User, 'countDocuments');
            createStub = sinon.stub(User, 'create');
        });

        it('should register a user', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', name: 'test', password: 'password' });

            findOneStub.returns(null);
            countDocumentsStub.returns(0);
            createStub.returns({ _id: '123', email: 'test@mock.com', name: 'test', role: 'admin' });

            await handler.register(req, res);

            expect(findOneStub.calledOnce).to.be.true;
            expect(countDocumentsStub.calledOnce).to.be.true;
            expect(createStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.CREATED)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });

        it('should throw an error if email already exists', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', name: 'test', password: 'password' });

            findOneStub.returns({ email: 'test@mock.com' });

            try {
                await handler.register(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Email already exists');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);                
            }
        });
    });


    describe('@login', () => {
        let findOneStub, comparePasswordStub;

        beforeEach(() => {
            comparePasswordStub = sinon.stub();
            findOneStub = sinon.stub(User, 'findOne').returns({
                comparePassword: comparePasswordStub
            })
        });

        it('should login a user', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', password: 'password' });

            comparePasswordStub.returns(true);
            await handler.login(req, res);

            expect(findOneStub.calledOnce).to.be.true;
            expect(comparePasswordStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });

        it('should throw an error if user does not exist', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', password: 'password' });

            findOneStub.returns(null);

            try {
                await handler.login(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('UnauthenticatedError');
                expect(error.message).to.equal('Invalid Credentials');
                expect(error.statusCode).to.equal(StatusCodes.UNAUTHORIZED);
            }
        });

        it('should throw an error if password is incorrect', async () => {
            const { req, res } = createMockReqRes({ email: 'test@mock.com', password: 'password' });

            comparePasswordStub.returns(false);

            try {
                await handler.login(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(comparePasswordStub.calledOnce).to.be.true;
                expect(error.name).to.equal('UnauthenticatedError');
                expect(error.message).to.equal('Invalid Credentials');
                expect(error.statusCode).to.equal(StatusCodes.UNAUTHORIZED);
            }
        });

        it('should throw an error if email or password is missing', async () => {
            const { req, res } = createMockReqRes({ email: null, password: 'password' });

            try {
                await handler.login(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Please provide email and password');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });
    });


    describe('@logout', () => {
        it('should logout a user', async () => {
            const { req, res } = createMockReqRes();

            await handler.logout(req, res);

            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });
});