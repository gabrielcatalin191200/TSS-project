const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');
const { StatusCodes } = require('http-status-codes');

const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const handler = rewire('../../../controllers/orderController');

handler.__set__('checkPermissions', sinon.stub());
handler.__set__('fakeStripeAPI', sinon.stub().resolves({
    client_secret: "someRandomValue", amount: 500
}));

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


describe("orderController", () => {
    afterEach(() => {
        sinon.restore();
    });

    describe("@createOrder", () => {
        let findOneStub, createStub;
    
        beforeEach(() => {
            findOneStub = sinon.stub(Product, 'findOne');
            createStub = sinon.stub(Order, 'create');
        });
    
        it('should throw BadRequestError if no cart items are provided', async () => {
            const { req, res } = createMockReqRes({ tax: 5, shippingFee: 10 });
    
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('No cart items provided');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });

        it('should throw BadRequestError if no cart items are provided', async () => {
            const { req, res } = createMockReqRes({ tax: 5, shippingFee: 10, items: []});
    
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('No cart items provided');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });

        it('should throw BadRequestError if no tax or shipping fee is provided', async () => {
            const { req, res } = createMockReqRes({ items: [{ mock: true }] });
    
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Please provide tax and shipping fee');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        })

        
        it('should throw BadRequestError if no tax or shipping fee is provided', async () => {
            const { req, res } = createMockReqRes({ items: [{ mock: true }] });
    
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('Please provide tax and shipping fee');
                expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
            }
        });

        it('should verify the structure of fakeStripeAPI response', async () => {
            const productID = 'prod1';
            const { req, res } = createMockReqRes({
                items: [{ product: productID, amount: 1 }],
                tax: 10,
                shippingFee: 5
            });

            findOneStub.resolves({ name: 'mock', price: 500, image: 'mock.jpg', _id: productID });
            createStub.resolves({
                clientSecret: '',
                total: 515,
                subtotal: 500,
                tax: 10,
                shippingFee: 5,
                orderItems: [{
                    amount: 1,
                    product: productID,
                    price: 500,
                    image: 'mock.jpg',
                    name: 'mock'
                }]
            });
        
            handler.__set__('fakeStripeAPI', sinon.stub().resolves({ client_secret: '', amount: 0 }));
        
            await handler.createOrder(req, res);
        
            expect(res.status.calledWith(StatusCodes.CREATED)).to.be.true;
            expect(res.json.args[0][0].clientSecret).to.equal('');
        });        


        it('should throw BadRequestError if cart items are empty', async () => {
            const { req, res } = createMockReqRes({ tax: 10, shippingFee: 5 });
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(error.name).to.equal('BadRequestError');
                expect(error.message).to.equal('No cart items provided');
            }
        });

        
        it('should throw NotFoundError if product is not found', async function () {
            const id = '507f1f77bcf86cd799439011'
            const { req, res } = createMockReqRes({
                items: [{ product: id, amount: 1 }],
                tax: 5,
                shippingFee: 10
            });
    
            findOneStub.resolves(null);
    
            try {
                await handler.createOrder(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No product with id: ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    
        it('should create an order', async () => {
            const id = '507f1f77bcf86cd799439011';
            const { req, res } = createMockReqRes({
                items: [{ product: id, amount: 1 }],
                tax: 5,
                shippingFee: 10
            }, { userId: '507f1f77bcf86cd799439012' });
    
            findOneStub.resolves({ name: 'mock', price: 500, image: 'mock.jpg', _id: id });
            createStub.resolves({ clientSecret: 'mockSecret' });
    
            await handler.createOrder(req, res);
    
            expect(createStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.CREATED)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    });
    
    
    describe("@getAllOrders", () => {
        let findStub;
    
        beforeEach(() => {
            findStub = sinon.stub(Order, 'find');
        });
    
        it('should return all orders', async () => {
            const { req, res } = createMockReqRes();
    
            findStub.resolves([{ mock: true }]);
    
            await handler.getAllOrders(req, res);
    
            expect(findStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.calledWith({ orders: [{ mock: true }], count: 1 })).to.be.true;
        });
    });
    
    
    describe("@getSingleOrder", () => {
        let findOneStub;
    
        beforeEach(() => {
            findOneStub = sinon.stub(Order, 'findOne');
        });
    
        it('should return a single order', async () => {
            const id = '507f1f77bcf86cd799439011';
            const { req, res } = createMockReqRes({}, { id }, { userId: '507f1f77bcf86cd799439012' });
    
            findOneStub.resolves({ mock: true });
    
            await handler.getSingleOrder(req, res);
    
            expect(findOneStub.calledOnce).to.be.true;
            expect(findOneStub.calledWith({ _id: id })).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.calledWith({ order: { mock: true } })).to.be.true;
        });
    
        it('should return NotFoundError if order is not found', async () => {
            const id = '507f1f77bcf86cd799439011';
            const { req, res } = createMockReqRes({}, { id }, { userId: '507f1f77bcf86cd799439012' });
    
            findOneStub.resolves(null);
    
            try {
                await handler.getSingleOrder(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No order with id: ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    });
    
    
    describe("@getCurrentUserOrders", () => {
        let findStub;
    
        beforeEach(() => {
            findStub = sinon.stub(Order, 'find');
        });
    
        it('should return all orders for a user', async () => {
            const { req, res } = createMockReqRes({ }, {}, { userId: '507f1f77bcf86cd799439012' });
    
            findStub.resolves([{ mock: true }]);
    
            await handler.getCurrentUserOrders(req, res);
    
            expect(findStub.calledOnce).to.be.true;
            expect(findStub.calledWith({ user: '507f1f77bcf86cd799439012' })).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
            expect(res.json.calledWith({ orders: [{ mock: true }], count: 1 })).to.be.true;
        });
    });
    
    
    describe("@updateOrder", () => {
        let findOneStub, mockOrder;
    
        beforeEach(() => {
            mockOrder = {
                save: sinon.stub().resolves({ mock: true })
            };
            findOneStub = sinon.stub(Order, 'findOne');
        });
    
        it('should update an order', async () => {
            const id = '507f1f77bcf86cd799439011';
            const { req, res } = createMockReqRes({ paymentIntentId: 'mock' }, { id }, { userId: '507f1f77bcf86cd799439012' });
    
            findOneStub.resolves(mockOrder);
            await handler.updateOrder(req, res);
    
            expect(findOneStub.calledOnce).to.be.true;
            expect(mockOrder.save.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledOnce).to.be.true;
        });
    
        it('should return NotFoundError if order is not found', async () => {
            const id = '507f1f77bcf86cd799439011';
            const { req, res } = createMockReqRes({ paymentIntentId: 'mock' }, { id }, { userId: '507f1f77bcf86cd799439012' });
    
            findOneStub.resolves(null);
    
            try {
                await handler.updateOrder(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No order with id: ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    });
})