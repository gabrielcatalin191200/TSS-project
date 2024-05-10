const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');
const { StatusCodes } = require('http-status-codes');

const Product = require('../../../models/Product');
const Review = require('../../../models/Review');
const handler = rewire('../../../controllers/reviewController.js');

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

handler.__set__('checkPermissions', sinon.stub().returns(true));


describe('reviewController', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('createReview', () => {
        let createStub;
        let findOneProductStub;
        let findOneReviewStub;

        beforeEach(() => {
            createStub = sinon.stub(Review, 'create');
            findOneProductStub = sinon.stub(Product, 'findOne');
            findOneReviewStub = sinon.stub(Review, 'findOne');
        });

        it('should create a review', async () => {
            const { req, res } = createMockReqRes({ product: '123', rating: 5, title: 'title', comment: 'comment' }, {}, { userId: '123' });

            const mockProduct = { _id: '123' };
            const mockReview = { _id: '123', product: '123', rating: 5, title: 'title', comment: 'comment' };
            findOneProductStub.returns(mockProduct);
            findOneReviewStub.returns(null);
            createStub.returns(mockReview);

            await handler.createReview(req, res);

            expect(findOneProductStub.calledOnce).to.be.true;
            expect(findOneProductStub.calledWith({ _id: '123' })).to.be.true;
            expect(findOneReviewStub.calledOnce).to.be.true;
            expect(findOneReviewStub.calledWith({ product: '123', user: '123' })).to.be.true;
            expect(createStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.CREATED)).to.be.true;
            expect(res.json.calledWith({ review: mockReview })).to.be.true;
        });

        it('should throw a not found error if product does not exist', async () => {
            const id = '123';
            const { req, res } = createMockReqRes({ product: id, rating: 5, title: 'title', comment: 'comment' }, {}, { userId: '123' });

            findOneProductStub.returns(null);

            try {
                await handler.createReview(req, res);
            } catch (error) {
                expect(findOneProductStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No product with id: ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });

        it('should throw a bad request error if review already exists', async () => {
            const id = '123'
            const { req, res } = createMockReqRes({ product: id, rating: 5, title: 'title', comment: 'comment' }, {}, { userId: '123' });

            const mockProduct = { _id: id };
            const mockReview = { _id: id, product: id, rating: 5, title: 'title', comment: 'comment' };
            findOneProductStub.returns(mockProduct);
            findOneReviewStub.returns(mockReview);

            try {
                await handler.createReview(req, res);
            } catch (err) {
                expect(findOneProductStub.calledOnce).to.be.true;
                expect(findOneReviewStub.calledOnce).to.be.true;
                expect(err.name).to.equal('BadRequestError');
                expect(err.message).to.equal('Already submitted review for this product');
            }
        });
    });


    describe('getAllReviews', () => {
        let findStub, populateStub;

        beforeEach(() => {
            populateStub = sinon.stub().resolves();
            findStub = sinon.stub(Review, 'find').returns({
                populate: sinon.stub().returns({
                    populate: populateStub
                })
            });
        });

        it('should get all reviews', async () => {
            const { req, res } = createMockReqRes({}, {}, {});

            const mockReviews = [{ _id: '123', product: '123', rating: 5, title: 'title', comment: 'comment' }];
            populateStub.resolves(mockReviews);
            await handler.getAllReviews(req, res);

            expect(findStub.calledOnce).to.be.true;
            expect(findStub.calledWith({})).to.be.true;
            expect(populateStub.calledOnce).to.be.true;
            expect(populateStub.calledWith({ path: 'user', select: 'name' })).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ reviews: mockReviews })).to.be.true;
        });
    })


    describe('getSingleReview', () => {
        let findOneStub;

        beforeEach(() => {
            findOneStub = sinon.stub(Review, 'findOne');
        });

        it('should get a single review', async () => {
            const id = '123';
            const { req, res } = createMockReqRes({}, { id }, {});

            const mockReview = { _id: id, product: '123', rating: 5, title: 'title', comment: 'comment' };
            findOneStub.resolves(mockReview);

            await handler.getSingleReview(req, res);

            expect(findOneStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ review: mockReview })).to.be.true;
        });

        it('should return NotFoundError if review is not found', async () => {
            const id = '123';
            const { req, res } = createMockReqRes({}, { id }, {});

            findOneStub.resolves(null);

            try {
                await handler.getSingleReview(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No review with id ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    });


    describe('updateReview', () => {
        let findOneStub;

        beforeEach(() => {
            findOneStub = sinon.stub(Review, 'findOne')
        });

        it('should update a review', async () => {
            const { req, res } = createMockReqRes({
                rating: 5, 
                title: 'New Title', 
                comment: 'New Comment'
            }, { id: '123' }, { userId: '123' });
            const mockReview = {
                _id: '123',
                product: '123',
                user: 'user123',
                rating: 3,
                title: 'Old Title',
                comment: 'Old Comment',
                save: sinon.stub().resolves()
            };
    
            findOneStub.resolves(mockReview);
            await handler.updateReview(req, res);
    
            expect(findOneStub.calledOnce).to.be.true;
            expect(mockReview.save.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(mockReview.rating).to.equal(5);
            expect(mockReview.title).to.equal('New Title');
            expect(mockReview.comment).to.equal('New Comment');
            expect(res.json.calledWith({ review: mockReview })).to.be.true;
        });

        it('should return NotFoundError if review is not found', async () => {
            const id = '123';
            const { req, res } = createMockReqRes({ rating: 5, title: 'title', comment: 'comment' }, { id }, { userId: '123' });

            findOneStub.resolves(null);

            try {
                await handler.updateReview(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No review with id ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    });


    describe('deleteReview', () => {
        let findOneStub;

        beforeEach(() => {
            findOneStub = sinon.stub(Review, 'findOne');
        });

        it('should delete a review', async () => {
            const { req, res } = createMockReqRes({}, { id: '123' }, { userId: '123' });
            const mockReview = {
                _id: '123',
                product: '123',
                user: '123',
                remove: sinon.stub().resolves()
            };

            findOneStub.resolves(mockReview);
            await handler.deleteReview(req, res);

            expect(findOneStub.calledOnce).to.be.true;
            expect(mockReview.remove.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ msg: "Success! Review deleted" })).to.be.true;
        });

        it('should return NotFoundError if review is not found', async () => {
            const id = '123';
            const { req, res } = createMockReqRes({}, { id }, { userId: '123' });

            findOneStub.resolves(null);

            try {
                await handler.deleteReview(req, res);
            } catch (error) {
                expect(findOneStub.calledOnce).to.be.true;
                expect(error.name).to.equal('NotFoundError');
                expect(error.message).to.equal(`No review with id ${id}`);
                expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
            }
        });
    });


    describe('getSingleProductReviews', () => {
        let findStub;

        beforeEach(() => {
            findStub = sinon.stub(Review, 'find');
        });

        it('should get all reviews for a product', async () => {
            const { req, res } = createMockReqRes({}, { productId: '123' });

            const mockReviews = [{ _id: '123', product: '123', rating: 5, title: 'title', comment: 'comment' }];
            findStub.resolves(mockReviews);
            await handler.getSingleProductReviews(req, res);

            expect(findStub.calledOnce).to.be.true;
            expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
            expect(res.json.calledWith({ reviews: mockReviews, count: mockReviews.length })).to.be.true;
        });
    });
})
