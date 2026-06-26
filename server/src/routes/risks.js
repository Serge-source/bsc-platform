const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('risk', {
  searchFields: ['name','description','category'],
  include: { controls: true, mitigations: true, owner: { select: { id: true, firstName: true, lastName: true } } },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
