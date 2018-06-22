// 用于计算偏移量
var deltaEye;
var deltaAt;
var deltaUp = zero;
var nums;
// 每60帧移动 MOVE_VELOCITY，据说 requestAnimationFrame 是每秒60帧
var move_velocity = MOVE_VELOCITY / 60.0;
var rot_velocity = ROT_VELOCITY / 360.0;
var cos = Math.cos(rot_velocity);
var sin = Math.sin(rot_velocity);


/**
 *
 * @param evt 响应键盘事件
 */
function keyDownEvent(evt) {
    if (evt.keyCode === 38) {
        if (fogDist[1] < 300)
            fogDist[1] += 1;
    } else if (evt.keyCode === 40) {
        if (fogDist[1] > fogDist[0])
            fogDist[1] -= 1;
    } else if (evt.keyCode === 70) {
        usingPointLight = true;
    } else {
        // deltaUp = zero;
        deltaEye = zero;
        deltaAt = zero;

        var face = vectorMinus(at, eye).normalize();
        var v = vectorCross(up, face).normalize();
        // var axis = vectorCross(v, face).normalize();
        if (evt.keyCode === 65) {//a
            deltaEye = vectorAdd(deltaEye, vectorMultNum(v, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }
        if (evt.keyCode === 83) { //s
            var tmp_face = vectorReverse(face);
            deltaEye = vectorAdd(deltaEye, vectorMultNum(tmp_face, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);

        }
        if (evt.keyCode === 68) { //d
            var temp_v = vectorReverse(v);
            deltaEye = vectorAdd(deltaEye, vectorMultNum(temp_v, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }
        if (evt.keyCode === 87) { //w
            deltaEye = vectorAdd(deltaEye, vectorMultNum(face, move_velocity));
            deltaAt = vectorAdd(deltaAt, deltaEye);
        }

        /***********        旋转           ********************/
        /**
         * 说明：
         * 旋转这里做的可能不是太好，我的计算方式是
         * 1，计算look-at-point的delta（偏移）
         * 2，根据改变后的look-at-point位置（偏移后的），计算新的up-vector
         *    使新的up-vector与之正交。
         *    更新up-vector在函数 {@code deltaViewProjMatrix} 中
         */
        var left;
        var new_pos;
        if (evt.keyCode === 74) { //j
            left = vectorCopy(v);
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(left, sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        if (evt.keyCode === 76) { // l
            left = vectorReverse(v);
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(left, sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        if (evt.keyCode === 73) { // i 向上旋转
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(up, sin));
            deltaAt = vectorMinus(new_pos, face);

        }
        if (evt.keyCode === 75) { //k
            new_pos = vectorAdd(vectorMultNum(face, cos), vectorMultNum(up, -sin));
            deltaAt = vectorMinus(new_pos, face);
        }
        /********************      旋转结束          **************************************/
        nums = 10000;
    }
}
