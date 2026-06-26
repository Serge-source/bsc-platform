const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('perspective', {
  searchFields: ['name','description'],
  include: { kpis: { take: 5 } },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
