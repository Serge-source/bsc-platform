const router = require('express').Router();
const crudFactory = require('../utils/crudFactory');
const crud = crudFactory('scorecard', {
  searchFields: ['name','description'],
  include: { perspectives: { include: { perspective: true, kpis: { include: { kpi: true } } } }, department: true, strategy: true },
});
router.get('/', crud.list);
router.get('/:id', crud.get);
router.post('/', crud.create);
router.put('/:id', crud.update);
router.delete('/:id', crud.remove);
module.exports = router;
