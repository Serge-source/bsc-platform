const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('kPIValue', {
  searchFields: ['period','notes'],
  include: {},
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
