const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');
const { StatusCodes } = require('http-status-codes');

const Product = require('../../../models/Product');
const handler = rewire('../../../controllers/productController');

const createMockReqRes = (body = {}, params = {}, user = {}) => {
  return {
    req: {
      body,
      params,
      user: user,
    },
    res: {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    },
  };
};

describe('productController', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('@createProduct', () => {
    let createStub;

    beforeEach(() => {
      createStub = sinon.stub(Product, 'create');
    });

    it('should create a product', async () => {
      const { req, res } = createMockReqRes(
        { name: 'product1', price: 100, description: 'description' },
        {},
        { userId: '123' }
      );

      const mockProduct = {
        _id: '123',
        name: 'product1',
        price: 100,
        description: 'description',
      };
      createStub.returns(mockProduct);

      await handler.createProduct(req, res);

      expect(createStub.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.CREATED)).to.be.true;
      expect(res.json.calledWith({ product: mockProduct })).to.be.true;
    });
  });

  describe('@getAllProducts', () => {
    let findStub;

    beforeEach(() => {
      findStub = sinon.stub(Product, 'find');
    });

    it('should get all products', async () => {
      const { req, res } = createMockReqRes();

      const mockProducts = [
        {
          _id: '123',
          name: 'product1',
          price: 100,
          description: 'description',
        },
      ];
      findStub.returns(mockProducts);

      await handler.getAllProducts(req, res);

      expect(findStub.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
      expect(
        res.json.calledWith({
          products: mockProducts,
          count: mockProducts.length,
        })
      ).to.be.true;
    });
  });

  describe('@getSingleProduct', () => {
    let findOneStub, populateStub;

    beforeEach(() => {
      populateStub = sinon.stub().resolves();
      findOneStub = sinon
        .stub(Product, 'findOne')
        .returns({ populate: populateStub });
    });

    it('should get a single product', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes(
        {},
        { id },
        { userId: '507f1f77bcf86cd799439012' }
      );

      const mockProduct = {
        _id: '123',
        name: 'product1',
        price: 100,
        description: 'description',
      };
      findOneStub().populate.resolves(mockProduct);

      await handler.getSingleProduct(req, res);

      expect(populateStub.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
      expect(res.json.calledWith({ product: mockProduct })).to.be.true;
    });

    it('should return NotFoundError if product is not found', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes(
        {},
        { id },
        { userId: '507f1f77bcf86cd799439012' }
      );

      findOneStub().populate.resolves(null);

      try {
        await handler.getSingleProduct(req, res);
      } catch (error) {
        expect(populateStub.calledOnce).to.be.true;
        expect(error.name).to.equal('NotFoundError');
        expect(error.message).to.equal(`No product with id: ${id}`);
        expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe('@updateProduct', () => {
    let findOneAndUpdateStub;

    beforeEach(() => {
      findOneAndUpdateStub = sinon.stub(Product, 'findOneAndUpdate');
    });

    it('should update a product', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes(
        { name: 'product1', price: 100, description: 'description' },
        { id },
        { userId: '123' }
      );

      const mockProduct = {
        _id: '123',
        name: 'product1',
        price: 100,
        description: 'description',
      };
      findOneAndUpdateStub.resolves(mockProduct);

      await handler.updateProduct(req, res);

      expect(findOneAndUpdateStub.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
      expect(res.json.calledWith({ product: mockProduct })).to.be.true;
    });

    it('should return NotFoundError if product is not found', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes(
        { name: 'product1', price: 100, description: 'description' },
        { id },
        { userId: '123' }
      );

      findOneAndUpdateStub.resolves(null);

      try {
        await handler.updateProduct(req, res);
      } catch (error) {
        expect(findOneAndUpdateStub.calledOnce).to.be.true;
        expect(error.name).to.equal('NotFoundError');
        expect(error.message).to.equal(`No product with id: ${id}`);
        expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe('@deleteProduct', () => {
    let findOneStub, removeStub;

    beforeEach(() => {
      findOneStub = sinon.stub(Product, 'findOne');
      removeStub = sinon.stub(Product.prototype, 'remove');
    });

    it('should delete a product', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes({}, { id }, { userId: '123' });

      findOneStub.resolves({ remove: removeStub });

      await handler.deleteProduct(req, res);

      expect(findOneStub.calledOnce).to.be.true;
      expect(removeStub.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
      expect(res.json.calledWith({ msg: 'Success! Product removed' })).to.be
        .true;
    });

    it('should return NotFoundError if product is not found', async () => {
      const id = '507f1f77bcf86cd799439011';
      const { req, res } = createMockReqRes({}, { id }, { userId: '123' });

      findOneStub.resolves(null);

      try {
        await handler.deleteProduct(req, res);
      } catch (error) {
        expect(findOneStub.calledOnce).to.be.true;
        expect(error.name).to.equal('NotFoundError');
        expect(error.message).to.equal(`No product with id: ${id}`);
        expect(error.statusCode).to.equal(StatusCodes.NOT_FOUND);
      }
    });
  });

  describe('@uploadImage', () => {
    let req, res;

    beforeEach(() => {
      req = {
        files: {
          image: {
            mimetype: 'image/png',
            size: 1024,
            mv: sinon.stub().resolves(),
          },
        },
      };

      res = createMockReqRes().res;
    });

    it('should upload an image', async () => {
      await handler.uploadImage(req, res);

      expect(req.files.image.mv.calledOnce).to.be.true;
      expect(res.status.calledWith(StatusCodes.OK)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
    });

    it('should throw BadRequestError if no file is uploaded', async () => {
      req.files = null;

      try {
        await handler.uploadImage(req, res);
      } catch (error) {
        expect(error.name).to.equal('BadRequestError');
        expect(error.message).to.equal('No File Uploaded');
        expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
      }
    });

    it('should throw BadRequestError if file is not an image', async () => {
      req.files.image.mimetype = 'text/plain';

      try {
        await handler.uploadImage(req, res);
      } catch (error) {
        expect(error.name).to.equal('BadRequestError');
        expect(error.message).to.equal('Please Upload Image');
        expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
      }
    });

    it('should throw BadRequestError if file size is greater than 1MB', async () => {
      req.files.image.size = 1024 * 1024 + 10;

      try {
        await handler.uploadImage(req, res);
      } catch (error) {
        expect(error.name).to.equal('BadRequestError');
        expect(error.message).to.equal('Please Upload Image smaller than 1 MB');
        expect(error.statusCode).to.equal(StatusCodes.BAD_REQUEST);
      }
    });
  });

  /*
    Clase de echivalență:
        price: valid (1-1000), invalid (<1, >1000)
        customerType: valid ("normal", "membru", "premium"), invalid (orice altceva)
    Teste la frontieră:
        price: 0, 1, 1000, 1001
        customerType: "normal", "membru", "premium", "unknown"
   */
  function calculateDiscount(price, customerType) {
    if (price < 1 || price > 1000) {
      throw new Error('Invalid price');
    }
    if (customerType !== 'normal' && customerType !== 'membru') {
      throw new Error('Invalid customer type');
    }
    if (customerType === 'membru') {
      return 5;
    }
    return 0;
  }

  describe('calculateDiscount', () => {
    it('should handle minimum edge price', () => {
      expect(calculateDiscount(1, 'normal')).toEqual(0); // Assuming no discount for edge case
    });
    it('should handle just over maximum edge price', () => {
      expect(() => calculateDiscount(1001, 'normal')).toThrow('Invalid price');
    });
    it('should handle maximum edge price', () => {
      expect(calculateDiscount(1000, 'normal')).toEqual(0);
    });
    it('should handle unknown customer type', () => {
      expect(() => calculateDiscount(100, 'unknown')).toThrow(
        'Invalid customer type'
      );
    });
    it('should handle normal customer type', () => {
      expect(calculateDiscount(100, 'normal')).toEqual(0);
    });
    it('should handle member customer type', () => {
      expect(calculateDiscount(100, 'membru')).toEqual(5);
    });
  });

  function decidePass(score, attendance) {
    if (score >= 50 && attendance >= 75) {
      return 'Pass';
    } else {
      return 'Fail';
    }
  }

  describe('decidePass', () => {
    it('should pass with high score and attendance', () => {
      expect(decidePass(90, 80)).toEqual('Pass');
    });
    it('should fail with low score', () => {
      expect(decidePass(40, 80)).toEqual('Fail');
    });
    it('should fail with low attendance', () => {
      expect(decidePass(60, 70)).toEqual('Fail');
    });
    it('should fail with low score and attendance', () => {
      expect(decidePass(40, 70)).toEqual('Fail');
    });
  });
});
